"""Convert the two supplied orthogonal SVG poses into a script-free Rive rig."""
from pathlib import Path
import math
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).with_name('scene.rml')
SVG = '{http://www.w3.org/2000/svg}'
BLADE = '#d6d8d7'
HANDLE = '#575b56'
counter = 0


def node(parent, tag, **attrs):
    global counter
    counter += 1
    return ET.SubElement(parent, tag, {'id': f'0:{counter}', **{k: str(v) for k, v in attrs.items()}})


def contours(path):
    # These assets use only absolute M/L/H/V/Z; reject unfamiliar geometry rather than corrupting it.
    tokens = re.findall(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)', path)
    assert not re.sub(r'[\s,]', '', re.sub(r'[A-Za-z]|[-+]?(?:\d*\.\d+|\d+)', '', path))
    result, points = [], []
    x = y = 0.0
    i = 0
    command = None
    while i < len(tokens):
        if tokens[i].isalpha():
            command = tokens[i]
            i += 1
        assert command in ('M', 'L', 'H', 'V', 'Z'), command
        if command == 'Z':
            assert len(points) >= 3
            result.append(points)
            points = []
            command = None
            continue
        if command in ('M', 'L'):
            x, y = map(float, tokens[i:i + 2])
            i += 2
            command = 'L'
        elif command == 'H':
            x = float(tokens[i]); i += 1
        else:
            y = float(tokens[i]); i += 1
        points.append((x, y))
    assert not points and result, 'Every supplied contour must be closed'
    return result


def track(animation, target, prop, keys, interpolation='linear'):
    obj = node(animation, 'KeyedObject', objectId=target.attrib['id'])
    keyed = node(obj, 'KeyedProperty', property=prop)
    for frame, value in keys:
        node(keyed, 'KeyFrameDouble', frame=frame, value=round(value, 5), interpolationType=interpolation)


def segment_points(a, b, half_width):
    length = math.hypot(b[0] - a[0], b[1] - a[1])
    assert length > 0
    nx, ny = -(b[1] - a[1]) / length * half_width, (b[0] - a[0]) / length * half_width
    return [(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny),
            (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)]


document = ET.Element('Rive', version='1', kind='fragment')
board = node(document, 'Artboard', name='Character', width=240, height=240)
impact = node(board, 'Event', name='hammer-impact')
recovered = node(board, 'Event', name='hammer-recovered')
rigs = {}
hammer_arms = {}
walk_frames = {}
hammer_frames = {}
hammer_handles = {}
leg_vertices = {}
hammer_shafts = [((30, -91), (-10, -73)), ((-4, -101), (-4, -56)), ((-53, -21), (-14, -21))]
hammer_hands = [[(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                 for t in (.35, .60)] for a, b in hammer_shafts]
idle_poses = [(0, 3, 0), (12, -3, 3), (26, 0, 3), (40, 3, 0)]

for side in ('right', 'left'):
    source = ET.parse(ROOT / f'public/images/character-{side}-facing.svg').getroot()
    source_group = source.find(f'{SVG}g')
    assert source_group is not None
    groups = {}
    for group in source_group:
        entries = []
        for path in group:
            assert path.tag == SVG + 'path'
            color = path.get('fill', group.get('fill'))
            assert color and color.startswith('#')
            entries.extend((points, color) for points in contours(path.attrib['d']))
        groups[group.attrib['id']] = entries
    assert set(groups) == {'body', 'eyes', 'legs', 'arm', 'hammer'}
    if side == 'left':
        # The supplied left pose hides its handle behind the body; extend it for the overhead lift.
        groups['hammer'].insert(0, ([(400, 320), (450, 320), (450, 570), (400, 570)], '#656763'))
    body_x = [x for points, _ in groups['body'] for x, _ in points]
    base = max(y for points, _ in groups['legs'] for _, y in points)
    center = (min(body_x) + max(body_x)) / 2
    scale = 72 / (max(body_x) - min(body_x))

    def normalized(point, center=center, scale=scale, base=base):
        return ((point[0] - center) * scale, (point[1] - base) * scale)

    if side == 'right':
        source.attrib.update(width='240', height='240', viewBox='0 0 240 240')
        source_group.set('transform', f'translate(120 212) scale({scale}) translate({-center} {-base})')
        ET.register_namespace('', SVG[1:-1])
        ET.indent(source, space='  ')
        fallback = ROOT / 'public/animations/character-preview.svg'
        fallback.parent.mkdir(parents=True, exist_ok=True)
        fallback.write_text(ET.tostring(source, encoding='unicode') + '\n', encoding='utf-8')

    actor = node(board, 'Node', name=f'{side}-actor', x=120, y=212, opacity=int(side == 'right'))
    parts = {}
    calves = []
    # Rive sibling draw order is the reverse of SVG draw order.
    for name in reversed(list(groups)):
        entries = groups[name]
        if name == 'legs':
            feet = sorted(entries[:2], key=lambda entry: min(x for x, _ in entry[0]))
            midpoint = sum(sum(x for x, _ in entry[0]) / len(entry[0]) for entry in feet) / 2
            buckets = {'leg-a': [], 'leg-b': []}
            for points, color in entries:
                key = 'leg-a' if sum(x for x, _ in points) / len(points) < midpoint else 'leg-b'
                buckets[key].append((points, color))
        else:
            buckets = {name: entries}
        for part_name, shapes in buckets.items():
            if part_name == 'hammer':
                pivot = (350, 500) if side == 'right' else (432, 553)
            elif part_name == 'arm':
                pivot = (250, 470) if side == 'right' else (955, 590)
            else:
                all_points = [p for points, _ in shapes for p in points]
                pivot = (sum(x for x, _ in all_points) / len(all_points), min(y for _, y in all_points))
            px, py = normalized(pivot)
            part = node(actor, 'Node', name=f'{side}-{part_name}', x=round(px, 5), y=round(py, 5))
            parts[part_name] = part
            for points, color in reversed(shapes):
                shape = node(part, 'Shape', name=part_name)
                area = sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(points, points[1:] + points[:1]))
                path = node(shape, 'PointsPath', isClosed='true', isClockwise=str(area > 0).lower())
                for x, y in points:
                    nx, ny = normalized((x, y))
                    vertex = node(path, 'StraightVertex', x=round(nx - px, 5), y=round(ny - py, 5))
                    if part_name.startswith('leg'):
                        # Keep ankle vertices fixed too, so shifting calves cannot drag the sole edges.
                        weight = max(0, (-ny - 8) / (-py - 8))
                        calves.append((vertex, nx - px, ny - py, weight))
                fill = node(shape, 'Fill', name='Source fill')
                hex_color = color[1:]
                if len(hex_color) == 3:
                    hex_color = ''.join(c * 2 for c in hex_color)
                node(fill, 'SolidColor', colorValue='FF' + hex_color.upper())
    # Two raised drawings plus the source feet-down pose reproduce the recorded step cycle.
    ink, shade = groups['legs'][0][1], groups['legs'][-1][1]
    drawings = [
        [([(-12, -30), (-2, -30), (-2, -8), (2, -8), (2, -6), (6, -6), (6, 0),
           (-22, 0), (-22, -6), (-18, -6), (-18, -8), (-12, -8)], ink),
         ([(-4, -28), (-2, -28), (-2, -8), (-4, -8)], shade)],
        [([(-40, -30), (-30, -30), (-30, -8), (-34, -8), (-34, -6), (-44, -6),
           (-44, -12), (-40, -12)], ink),
         ([(12, -20), (20, -20), (20, -16), (24, -16), (24, -12), (28, -12),
           (28, -6), (34, -6), (34, 0), (8, 0), (8, -6), (20, -6), (20, -10),
           (16, -10), (16, -14), (12, -14)], ink),
         ([(-32, -28), (-30, -28), (-30, -8), (-32, -8)], shade)],
    ]
    sprites = []
    for index, drawing in enumerate(drawings):
        sprite = node(actor, 'Node', name=f'{side}-step-{index}', opacity=0)
        actor.remove(sprite)
        actor.insert(0, sprite)
        sprites.append(sprite)
        for points, color in reversed(drawing):
            shape = node(sprite, 'Shape', name='Walk frame')
            path = node(shape, 'PointsPath', isClosed='true', isClockwise=str(side == 'left').lower())
            for x, y in points:
                node(path, 'StraightVertex', x=-x if side == 'right' else x, y=y)
            fill = node(shape, 'Fill', name='Source leg fill')
            node(fill, 'SolidColor', colorValue='FF' + color[1:].upper())
    walk_frames[side] = sprites
    leg_vertices[side] = calves
    # The blade changes silhouette between drawings; rotating the carried SVG puts its edge underneath.
    tool_drawings = [
        [(segment_points(*hammer_shafts[0], 3), HANDLE),
         ([(22, -112), (40, -112), (40, -60), (22, -60)], '#a4a5a3'),
         ([(40, -112), (54, -112), (54, -78), (50, -78), (50, -70), (46, -70),
           (46, -64), (40, -64)], BLADE)],
        [(segment_points(*hammer_shafts[1], 3), HANDLE),
         ([(-26, -116), (-6, -116), (-6, -92), (-26, -92)], '#a4a5a3'),
         ([(-6, -116), (14, -116), (14, -112), (20, -112), (20, -108), (26, -108),
           (26, -104), (30, -104), (30, -100), (34, -100), (34, -92), (-6, -92)], BLADE)],
        [(segment_points(*hammer_shafts[2], 3), HANDLE),
         ([(-56, -50), (-48, -50), (-48, 0), (-68, 0), (-68, -30), (-64, -30),
           (-64, -38), (-60, -38), (-60, -44), (-56, -44)], '#a4a5a3'),
         ([(-48, -50), (-44, -50), (-44, 0), (-48, 0)], BLADE)],
    ]
    # Compact stepped silhouettes follow the supplied three-frame arm poses.
    arm_drawings = [
        [[(-28, -61), (-22, -61), (-22, -67), (-10, -67), (-10, -73), (2, -73),
          (2, -79), (12, -79), (12, -88), (20, -88), (20, -81), (16, -81),
          (16, -75), (6, -75), (6, -69), (-6, -69), (-6, -63), (-18, -63),
          (-18, -57), (-28, -57)],
         [(21, -36), (28, -36), (28, -48), (24, -48), (24, -60), (20, -60),
          (20, -68), (16, -68), (16, -76), (10, -76), (10, -82), (4, -82),
          (4, -74), (8, -74), (8, -66), (12, -66), (12, -58), (16, -58),
          (16, -46), (21, -46)]],
        [[(-24, -61), (-16, -61), (-16, -67), (-10, -67), (-10, -75), (-8, -75),
          (-8, -87), (0, -87), (0, -78), (-4, -78), (-4, -70), (-10, -70),
          (-10, -62), (-16, -62), (-16, -57), (-24, -57)],
         [(20, -36), (28, -36), (28, -44), (24, -44), (24, -52), (20, -52),
          (20, -60), (12, -60), (12, -66), (4, -66), (4, -74), (-8, -74),
          (-8, -68), (-2, -68), (-2, -62), (6, -62), (6, -56), (12, -56),
          (12, -48), (16, -48), (16, -40), (20, -40)]],
        [[(-35, -30), (-29, -30), (-29, -18), (-42, -18), (-42, -24), (-35, -24)],
         [(20, -30), (28, -30), (28, -22), (20, -22), (20, -16), (-33, -16),
          (-33, -24), (-25, -24), (-25, -20), (12, -20), (12, -24), (20, -24)]],
    ]
    sprites = []
    handles = []
    arms = []
    for index, drawing in enumerate(tool_drawings):
        sprite = node(actor, 'Node', name=f'{side}-hammer-frame-{index}', opacity=0)
        sprites.append(sprite)
        arm = node(actor, 'Node', name=f'{side}-hammer-arms-{index}', opacity=0)
        actor.remove(arm)
        actor.insert(0, arm)
        arms.append(arm)
        # Shaft overlaps the head; both hands wrap over it, and the head hides the socket join.
        handle = node(actor, 'Node', name=f'{side}-hammer-handle-{index}', opacity=0)
        actor.remove(handle)
        actor.insert(0, handle)
        actor.remove(sprite)
        actor.insert(0, sprite)
        handles.append(handle)
        layers = [(handle, *drawing[0])]
        a, b = hammer_shafts[index]
        length = math.hypot(b[0] - a[0], b[1] - a[1])
        ux, uy = (b[0] - a[0]) / length, (b[1] - a[1]) / length
        for limb, (gx, gy) in enumerate(hammer_hands[index]):
            grip = segment_points((gx - ux * 2.5, gy - uy * 2.5), (gx + ux * 2.5, gy + uy * 2.5), 3.5)
            layers.append((handle, grip, groups['arm'][0 if limb == 0 else -1][1]))
        layers.extend([(arm, arm_drawings[index][1], groups['arm'][-1][1]),
                       (arm, arm_drawings[index][0], groups['arm'][0][1])])
        layers.extend((sprite, points, color) for points, color in drawing[1:])
        for parent, points, color in reversed(layers):
            shape = node(parent, 'Shape', name='Hammer frame')
            path = node(shape, 'PointsPath', isClosed='true', isClockwise=str(side == 'left').lower())
            for x, y in points:
                node(path, 'StraightVertex', x=-x if side == 'right' else x, y=y)
            fill = node(shape, 'Fill', name='Source tool fill')
            node(fill, 'SolidColor', colorValue='FF' + color[1:].upper())
    hammer_frames[side] = sprites
    hammer_handles[side] = handles
    hammer_arms[side] = arms
    rigs[side] = (actor, parts, groups, normalized)

animations = {}
for side in ('right', 'left'):
    actor, parts, groups, normalize = rigs[side]
    sign = 1 if side == 'right' else -1
    for mode, duration in [('idle', 40), ('walk', 25), ('hammer', 30), ('rush', 25)]:
        moving = mode in ('walk', 'rush')
        step_b, contact = 9, 16
        animation = node(board, 'LinearAnimation', name=f'{mode}-{side}', fps=60, duration=duration, loopValue='loop')
        animations[f'{mode}-{side}'] = animation
        for other_side, (other, _, _, _) in rigs.items():
            track(animation, other, 'opacity', [(0, int(other_side == side))])
        for prop, value in [('y', 212), ('scaleX', 1), ('scaleY', 1)]:
            keys = [(0, value)]
            if mode == 'hammer' and prop in ('scaleX', 'scaleY'):
                keys = [(0, 1), (20, 1.04 if prop == 'scaleX' else 0.90)]
            track(animation, actor, prop, keys, interpolation='hold' if mode == 'hammer' else 'linear')
        # The recording holds three drawings for about five frames each at 30fps.
        track(animation, parts['arm'], 'opacity', [(0, int(mode != 'hammer'))])
        track(animation, parts['hammer'], 'opacity', [(0, int(mode != 'hammer'))])
        for index, sprite in enumerate(hammer_frames[side]):
            keys = [(0, 0)] if mode != 'hammer' else [(frame * 10, int(frame == index)) for frame in range(3)]
            track(animation, sprite, 'opacity', keys, interpolation='hold')
            track(animation, hammer_handles[side][index], 'opacity', keys, interpolation='hold')
            track(animation, hammer_arms[side][index], 'opacity', keys, interpolation='hold')
        for index, sprite in enumerate(walk_frames[side]):
            keys = [(0, 0)] if not moving else [(0, 1 - index), (step_b, index), (contact, 0), (duration, 1 - index)]
            track(animation, sprite, 'opacity', keys, interpolation='hold')
        for part_name, part in parts.items():
            if part_name.startswith('leg'):
                keys = [(0, 1)] if not moving else [(0, 0), (contact, 1), (duration, 0)]
                track(animation, part, 'opacity', keys, interpolation='hold')
            for prop in ('x', 'y', 'rotation'):
                value = float(part.get(prop, 0))
                keys = [(0, value)]
                if mode == 'idle' and not part_name.startswith('leg') and prop in ('x', 'y'):
                    keys = [(frame, value + (-sign * dx if prop == 'x' else dy)) for frame, dx, dy in idle_poses]
                if moving and not part_name.startswith('leg') and prop == 'y':
                    keys = [(0, value - 2), (contact, value), (duration, value - 2)]
                track(animation, part, prop, keys, interpolation='hold')
        for vertex, x, y, weight in leg_vertices[side]:
            for prop, value in [('x', x), ('y', y)]:
                keys = [(frame, value + (-sign * dx if prop == 'x' else dy) * weight)
                        for frame, dx, dy in idle_poses] if mode == 'idle' else [(0, value)]
                track(animation, vertex, prop, keys, interpolation='hold')
        if mode == 'hammer':
            for event, frame in [(impact, 20), (recovered, 29)]:
                obj = node(animation, 'KeyedObject', objectId=event.attrib['id'])
                keyed = node(obj, 'KeyedProperty', property='trigger')
                node(keyed, 'KeyFrameCallback', frame=frame)

# Preserve the six existing pose values; the two rush states use 6 and 7.
pose_values = {'idle-right': 0, 'walk-right': 1, 'hammer-right': 2,
               'idle-left': 3, 'walk-left': 4, 'hammer-left': 5, 'rush-right': 6, 'rush-left': 7}
model = node(document, 'ViewModel', name='CharacterControls')
pose = node(model, 'ViewModelPropertyNumber', name='pose')
instance = node(model, 'ViewModelInstance', name='Default', exports='true')
node(instance, 'ViewModelInstanceNumber', viewModelPropertyId=pose.attrib['id'], propertyValue=0)
model.set('defaultInstanceId', instance.attrib['id'])
board.set('viewModelId', model.attrib['id'])
board.set('viewModelInstanceId', instance.attrib['id'])
machine = node(board, 'StateMachine', name='Character Controller')
board.set('defaultStateMachineId', machine.attrib['id'])
layer = node(machine, 'StateMachineLayer', name='Pose layer')
any_state = node(layer, 'AnyState')
node(layer, 'ExitState')
entry = node(layer, 'EntryState')
for name, animation in animations.items():
    value = pose_values[name]
    state = node(layer, 'AnimationState', animationId=animation.attrib['id'])
    if value == 0:
        node(entry, 'StateTransition', stateToId=state.attrib['id'])
    transition = node(any_state, 'StateTransition', stateToId=state.attrib['id'],
                      duration=0)
    condition = node(transition, 'TransitionViewModelCondition', opValue='equal')
    comparator = node(condition, 'TransitionPropertyViewModelComparator')
    bindable = node(comparator, 'BindablePropertyNumber')
    node(bindable, 'DataBindContext', sourcePathIds=f"{model.attrib['id']}-{pose.attrib['id']}", propertyKey=636)
    node(condition, 'TransitionValueNumberComparator', value=value)

assert len(animations) == 8
assert all(len(parts) == 6 for _, parts, _, _ in rigs.values())
ids = [e.attrib['id'] for e in document.iter() if 'id' in e.attrib]
assert len(ids) == len(set(ids))
ET.indent(document, space='  ')
OUT.write_text(ET.tostring(document, encoding='unicode') + '\n', encoding='utf-8')
print(f'Generated {OUT.name}: {len(ids)} objects, 8 animations, 2 independent leg rigs, source fills preserved.')
subprocess.run(['rive', str(OUT.parent), '--once'], check=True)
destination = ROOT / 'public/animations/character-preview.riv'
destination.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(OUT.parent / 'build/character-preview.riv', destination)
print(f'Copied verified runtime file to {destination.relative_to(ROOT)}')
