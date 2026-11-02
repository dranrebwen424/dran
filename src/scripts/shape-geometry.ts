import * as THREE from 'three';

export function createMotif(name: string, material: THREE.MeshBasicMaterial, geometries: THREE.BufferGeometry[]) {
  const group = new THREE.Group();
  const mesh = (geometry: THREE.BufferGeometry, surface: THREE.Material = material) => {
    geometries.push(geometry);
    const object = new THREE.Mesh(geometry, surface);
    group.add(object);
    return object;
  };
  const stroke = (points: THREE.Vector3[], radius = .018) => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let index = 1; index < points.length; index++) path.add(new THREE.LineCurve3(points[index - 1], points[index]));
    mesh(new THREE.TubeGeometry(path, Math.max(1, points.length - 1), radius, 6, false));
  };
  if (name === 'cube' || name === 'prism') {
    const solid = name === 'cube' ? new THREE.BoxGeometry(.7, .7, .7) : new THREE.CylinderGeometry(.28, .28, .85, 6);
    const edges = new THREE.EdgesGeometry(solid);
    const positions = edges.getAttribute('position');
    for (let index = 0; index < positions.count; index += 2) {
      stroke([new THREE.Vector3().fromBufferAttribute(positions, index), new THREE.Vector3().fromBufferAttribute(positions, index + 1)], .012);
    }
    solid.dispose();
    edges.dispose();
  } else if (name === 'starburst') {
    const outline = new THREE.Shape();
    for (let arm = 0; arm < 8; arm++) {
      for (const [offset, radius] of [[-.18, .45], [.18, .45], [Math.PI / 8, .17]]) {
        const angle = arm * Math.PI / 4 + offset;
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
        if (arm === 0 && offset < 0) outline.moveTo(x, y); else outline.lineTo(x, y);
      }
    }
    outline.closePath();
    const solid = new THREE.ExtrudeGeometry(outline, { depth: .16, bevelEnabled: false, steps: 1 });
    solid.translate(0, 0, -.08);
    const edges = new THREE.EdgesGeometry(solid);
    const positions = edges.getAttribute('position');
    for (let index = 0; index < positions.count; index += 2) {
      stroke([new THREE.Vector3().fromBufferAttribute(positions, index), new THREE.Vector3().fromBufferAttribute(positions, index + 1)], .009);
    }
    solid.dispose();
    edges.dispose();
  } else if (name === 'crown') {
    for (const y of [-.2, -.12]) {
      const rim = mesh(new THREE.TorusGeometry(.4, .022, 8, 64));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = y;
    }
    for (let tip = 0; tip < 5; tip++) {
      const angle = tip / 5 * Math.PI * 2;
      const point = (angle: number, radius: number, y: number) => new THREE.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
      const left = point(angle - Math.PI / 5, .4, -.1);
      const right = point(angle + Math.PI / 5, .4, -.1);
      stroke([left, point(angle, .45, .43), right], .022);
      stroke([point(angle - .42, .39, -.08), point(angle, .43, .29), point(angle + .42, .39, -.08)], .009);
    }
  } else if (name === 'ring' || name === 'arc') {
    mesh(new THREE.TorusGeometry(.4, name === 'ring' ? .035 : .023, 8, 64, name === 'ring' ? Math.PI * 2 : Math.PI * 1.65));
  } else if (name === 'cross') {
    mesh(new THREE.BoxGeometry(.17, .82, .12));
    mesh(new THREE.BoxGeometry(.82, .17, .12));
  } else if (name === 'chevrons') {
    for (const y of [-.3, 0, .3]) stroke([
      new THREE.Vector3(-.3, y - .1, 0), new THREE.Vector3(0, y + .15, 0), new THREE.Vector3(.3, y - .1, 0),
    ], .035);
  } else if (name === 'waves') {
    for (const y of [-.1, .1]) {
      const points = Array.from({ length: 49 }, (_, index) => new THREE.Vector3(index / 48 - .5, y + Math.sin(index / 48 * Math.PI * 6) * .065, 0));
      stroke(points, .018);
    }
  } else if (name === 'dots') {
    const points: THREE.Vector3[] = [];
    for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) {
      if (x * x + y * y < 18) points.push(new THREE.Vector3(x * .1, y * .1, Math.sqrt(.18 - (x * x + y * y) * .01) * .3));
    }
    const geometry = new THREE.SphereGeometry(.018, 6, 4);
    geometries.push(geometry);
    const dots = new THREE.InstancedMesh(geometry, material, points.length);
    const matrix = new THREE.Matrix4();
    points.forEach((point, index) => dots.setMatrixAt(index, matrix.makeTranslation(point.x, point.y, point.z)));
    group.add(dots);
  }
  return group;
}

