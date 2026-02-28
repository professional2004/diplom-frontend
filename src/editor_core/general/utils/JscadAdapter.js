import * as THREE from 'three'

// Helper: extract [x, y, z] from JSCAD vertex (array or object)
function extractCoords(vertex) {
  if (Array.isArray(vertex)) {
    return vertex.slice(0, 3)
  }
  if (vertex && typeof vertex === 'object') {
    if ('position' in vertex && Array.isArray(vertex.position)) {
      return vertex.position.slice(0, 3)
    }
    // Try direct x, y, z properties
    if ('x' in vertex && 'y' in vertex && 'z' in vertex) {
      return [vertex.x, vertex.y, vertex.z]
    }
  }
  return null
}

// Convert a JSCAD geom3 object into a THREE.BufferGeometry
export function jscadGeom3ToThreeGeometry(g3) {
  if (g3 == null) {
    throw new Error('No JSCAD geometry provided')
  }

  // Extract polygons from JSCAD geom3 object
  // JSCAD v2.x stores polygons in g3.polygons array
  const polygons = g3.polygons || []
  
  if (!Array.isArray(polygons) || polygons.length === 0) {
    throw new Error('No polygons found in JSCAD geometry')
  }

  const positions = []
  const indices = []
  let vertexCount = 0

  polygons.forEach(poly => {
    if (!poly || !poly.vertices || !Array.isArray(poly.vertices)) {
      return
    }

    const verts = poly.vertices
    const coords = verts
      .map(v => extractCoords(v))
      .filter(c => c !== null && c.length === 3)

    if (coords.length < 3) return

    // Fan triangulation
    for (let i = 1; i < coords.length - 1; i++) {
      const a = coords[0]
      const b = coords[i]
      const c = coords[i + 1]

      positions.push(a[0], a[1], a[2])
      positions.push(b[0], b[1], b[2])
      positions.push(c[0], c[1], c[2])

      indices.push(vertexCount, vertexCount + 1, vertexCount + 2)
      vertexCount += 3
    }
  })

  if (positions.length === 0) {
    throw new Error('No valid vertices extracted from JSCAD geometry')
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.computeVertexNormals()

  return geometry
}

export function createMeshFromJscad(g3, material = null) {
  const geometry = jscadGeom3ToThreeGeometry(g3)
  const mat = material || new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff, metalness: 0.1, roughness: 0.5 })
  return new THREE.Mesh(geometry, mat)
}
