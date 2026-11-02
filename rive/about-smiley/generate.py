"""Author the About smiley as native Rive vectors, animation and bound controls."""
from pathlib import Path
import shutil
import subprocess
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
counter = 0


def node(parent, tag, **attrs):
    global counter
    counter += 1
    return ET.SubElement(parent, tag, id=f'0:{counter}', **{k: str(v) for k, v in attrs.items()})


def track(animation, target, prop, keys, interpolation='linear'):
    obj = node(animation, 'KeyedObject', objectId=target.get('id'))
    keyed = node(obj, 'KeyedProperty', property=prop)
    for frame, value in keys:
        key = node(keyed, 'KeyFrameDouble', frame=frame, value=value, interpolationType=interpolation)
        if interpolation == 'cubic':
            node(key, 'CubicEaseInterpolator', x1=.42, y1=0, x2=.58, y2=1)


def polygon(parent, name, points):
    shape = node(parent, 'Shape', name=name)
    path = node(shape, 'PointsPath', isClosed='true')
    for x, y in points:
        node(path, 'StraightVertex', x=x, y=y)
    node(node(shape, 'Fill'), 'SolidColor', colorValue='FF000000')
    return shape


CELL = 100 / 14
left_edge = [(2, 1), (1, 2)] + [(0, row) for row in range(3, 7)] + [(1, 7), (2, 8)]
outline = [(column, row) for row in [0, 9] for column in range(3, 9)] + left_edge + [(11 - column, row) for column, row in left_edge]
eye_pixels = [(column, row) for column in [4, 7] for row in range(2, 5)]
mouth_pixels = [(2, 5), (9, 5), (3, 6), (8, 6)] + [(column, 7) for column in range(4, 8)]


def blocks(parent, name, cells):
    group = node(parent, 'Node', name=name)
    for column, row in cells:
        polygon(group, 'Pixel', [(x * CELL, y * CELL) for x, y in [
            (column, row), (column + 1, row), (column + 1, row + 1), (column, row + 1)]])
    return group


document = ET.Element('Rive', version='1', kind='fragment')
board = node(document, 'Artboard', name='Smiley', width=100, height=100)
body = node(board, 'Node', name='Contained giggle', x=50, y=50)
features = node(body, 'Node', name='Gentle movement')
mouth = node(features, 'Node', name='Mouth follow')
mouth_points = [((x - 6) * CELL, (y - 5) * CELL) for x, y in [
    (2, 5), (3, 5), (3, 6), (4, 6), (4, 7), (8, 7), (8, 6), (9, 6), (9, 5), (10, 5),
    (10, 6), (9, 6), (9, 7), (8, 7), (8, 8), (4, 8), (4, 7), (3, 7), (3, 6), (2, 6)]]
smile = polygon(mouth, 'Smile', mouth_points)
small_smile = [(x * .5, y * .5 + CELL * .5) for x, y in mouth_points]
mouth_vertices = list(smile.find('PointsPath'))
eyes = node(features, 'Node', name='Eyes follow')
eye_parts = []
for x in [-1.5 * CELL, 1.5 * CELL]:
    eye = node(eyes, 'Node', name='Left eye' if x < 0 else 'Right eye', x=x, y=-1.5 * CELL)
    squeezed = node(eye, 'Node', name='Squeezed eye', opacity=0)
    blocks(squeezed, 'Stepped chevron', [(px if x < 0 else -px - 1, py) for px, py in [(-1, -1.5), (0, -.5), (-1, .5)]])
    closed = node(eye, 'Node', name='Closed eyelid', opacity=0)
    blocks(closed, 'Pixel eyelid', [(-1, -.5), (0, -.5)])
    opened = polygon(eye, 'Open eye', [(px * CELL, py * CELL) for px, py in [(-.5, -1.5), (.5, -1.5), (.5, 1.5), (-.5, 1.5)]])
    eye_parts.append((eye, opened, closed, squeezed))
blocks(body, 'Stepped outline', [(column - 6, row - 5) for column, row in outline])

animations = []
for name, duration in [('Idle', 420), ('Giggle', 96), ('Blink', 20)]:
    animation = node(board, 'LinearAnimation', name=name, fps=60, duration=duration,
                     loopValue='loop' if name == 'Idle' else 'oneShot')
    animations.append(animation)
    giggle = name == 'Giggle'
    track(animation, features, 'y', [(0, 0), (105, -1.5), (210, 0), (315, 1), (420, 0)] if name == 'Idle' else [(0, 0)], 'cubic')
    track(animation, body, 'y', [(0, 50), (12, 50), (20, 48), (28, 50.7), (37, 48.4), (45, 50.5), (54, 49), (62, 50.25), (72, 50), (96, 50)] if giggle else [(0, 50)], 'cubic')
    track(animation, body, 'rotation', [(0, 0), (12, 0), (20, -.035), (28, .04), (37, -.03), (45, .025), (54, -.018), (62, .01), (72, 0), (96, 0)] if giggle else [(0, 0)], 'cubic')
    for vertex, normal, small in zip(mouth_vertices, mouth_points, small_smile):
        for axis, index in [('x', 0), ('y', 1)]:
            track(animation, vertex, axis, [(0, normal[index]), (12, small[index]), (72, small[index]), (96, normal[index])] if giggle else [(0, normal[index])], 'cubic')
    for index, (eye, opened, closed, squeezed) in enumerate(eye_parts):
        home = (-1.5 if index == 0 else 1.5) * CELL
        track(animation, eye, 'x', [(0, home), (12, home * 5 / 3), (72, home * 5 / 3), (96, home)] if giggle else [(0, home)], 'cubic')
        if giggle:
            scales = [(0, 1), (12, .1), (72, .1), (96, 1)]
            visibility = [(0, 1), (12, 0), (72, 0), (96, 1)]
            lids = [(0, 0)]
            squeeze = [(0, 0), (12, 1), (72, 1), (96, 0)]
        elif name == 'Blink':
            scales = [(0, 1), (6, .08), (12, .08), (20, 1)]
            visibility = [(0, 1), (6, 0), (12, 0), (20, 1)]
            lids = [(0, 0), (6, 1), (12, 1), (20, 0)]
            squeeze = [(0, 0)]
        else:
            scales, visibility, lids, squeeze = [(0, 1)], [(0, 1)], [(0, 0)], [(0, 0)]
        track(animation, opened, 'scaleY', scales, 'cubic')
        track(animation, opened, 'opacity', visibility, 'cubic')
        track(animation, closed, 'opacity', lids, 'cubic')
        track(animation, squeezed, 'opacity', squeeze, 'cubic')

model = node(document, 'ViewModel', name='SmileyControls')
properties = {}
instance = node(model, 'ViewModelInstance', name='Default', exports='true')
for name in ['eyesX', 'eyesY', 'mouthX', 'mouthY', 'expression']:
    prop = node(model, 'ViewModelPropertyNumber', name=name)
    properties[name] = prop
    node(instance, 'ViewModelInstanceNumber', viewModelPropertyId=prop.get('id'), propertyValue=0)
for target, prop, name in [(eyes, 13, 'eyesX'), (eyes, 14, 'eyesY'), (mouth, 13, 'mouthX'), (mouth, 14, 'mouthY')]:
    node(target, 'DataBindContext', sourcePathIds=f"{model.get('id')}-{properties[name].get('id')}", propertyKey=prop)
model.set('defaultInstanceId', instance.get('id'))
board.set('viewModelId', model.get('id'))
board.set('viewModelInstanceId', instance.get('id'))
machine = node(board, 'StateMachine', name='Smiley Controller')
board.set('defaultStateMachineId', machine.get('id'))
layer = node(machine, 'StateMachineLayer', name='Expression')
any_state = node(layer, 'AnyState')
node(layer, 'ExitState')
entry = node(layer, 'EntryState')
for value, animation in enumerate(animations):
    state = node(layer, 'AnimationState', animationId=animation.get('id'), reset='true')
    if value == 0:
        node(entry, 'StateTransition', stateToId=state.get('id'))
    transition = node(any_state, 'StateTransition', stateToId=state.get('id'), duration=100)
    condition = node(transition, 'TransitionViewModelCondition', opValue='equal')
    bindable = node(node(condition, 'TransitionPropertyViewModelComparator'), 'BindablePropertyNumber')
    node(bindable, 'DataBindContext', sourcePathIds=f"{model.get('id')}-{properties['expression'].get('id')}", propertyKey=636)
    node(condition, 'TransitionValueNumberComparator', value=value)

assert len(eye_parts) == 2 and len(animations) == 3
assert len(mouth_vertices) == len(small_smile) == len(mouth_points)
assert len({item.get('id') for item in document.iter() if item.get('id')}) == counter
ET.indent(document, space='  ')
(HERE / 'scene.rml').write_text(ET.tostring(document, encoding='unicode') + '\n', encoding='utf-8')
subprocess.run(['rive', str(HERE), '--once'], check=True)
shutil.copyfile(HERE / 'build/about-smiley.riv', ROOT / 'public/animations/about-smiley.riv')
pixels = [f'M{column + 1} {row + 2}h1v1h-1z' for column, row in outline + eye_pixels + mouth_pixels]
(ROOT / 'public/animations/about-smiley.svg').write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="28" height="28" shape-rendering="crispEdges">'
    f'<path fill="#000" d="{"".join(pixels)}"/></svg>\n', encoding='utf-8')
print('Built block-style Rive smiley: stepped outline, bar eyes, pixel smile, giggle/blink and matching SVG fallback.')
