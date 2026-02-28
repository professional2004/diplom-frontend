import * as THREE from 'three'

export default class Polyline2DEditor {
  constructor(container, options = {}) {
    if (!container) {
      throw new Error('Polyline2DEditor requires a DOM container')
    }

    this.container = container
    this.isPolygon = !!options.isPolygon
    this.onChange = options.onChange || (() => {})
    this.points = Array.isArray(options.points) ? options.points.slice() : []

    this._dragIndex = null
    this._isDragging = false
    this._isPanning = false
    this._panStart = new THREE.Vector2()
    this._cameraStartPos = new THREE.Vector3()

    this._initScene()
    this._bindEvents()
    this.updateGeometry()
    this._render()
  }

  // public API

  setPoints(points) {
    // update from outside without firing change event
    this.points = Array.isArray(points) ? points.slice() : []
    this.updateGeometry()
    this._render()
  }

  setPolygon(flag) {
    this.isPolygon = !!flag
    this.updateGeometry()
    this._render()
  }

  getPoints() {
    return this.points.slice()
  }

  dispose() {
    this.resizeObserver.disconnect()
    this._unbindEvents()
    // clean three objects
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) {
        if (Array.isArray(o.material)) {
          o.material.forEach((m) => m.dispose())
        } else {
          o.material.dispose()
        }
      }
    })
    this.renderer.dispose()
    // remove canvas
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }


  // internal helpers

  _initScene() {
    // scene & camera
    this.scene = new THREE.Scene()

    const w = this.container.clientWidth || 1
    const h = this.container.clientHeight || 1
    const aspect = w / h
    const d = 5

    this.camera = new THREE.OrthographicCamera(
      -d * aspect,
      d * aspect,
      d,
      -d,
      0.1,
      1000
    )
    this.camera.position.set(0, 0, 10)
    this.camera.lookAt(0, 0, 0)

    // renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    const canvas = this.renderer.domElement
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    this.container.appendChild(canvas)
    this.renderer.setSize(w, h, false)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    // grid helper (in XY plane)
    const grid = new THREE.GridHelper(10, 10, 0x444444, 0x888888)
    grid.rotation.x = -Math.PI / 2
    this.scene.add(grid)

    // shared geometry / materials for points and line
    this._pointGeom = new THREE.CircleGeometry(0.2, 16)
    // <-- changed base point color на голубой
    this._pointMaterial = new THREE.MeshBasicMaterial({ color: 0x89cffa })
    this._pointHighlightMaterial = new THREE.MeshBasicMaterial({ color: 0x4a90e2 })
    this._lineMaterial = new THREE.LineBasicMaterial({ color: 0x4a90e2 })

    // container for point meshes to make updates easy
    this._pointsGroup = new THREE.Group()
    this.scene.add(this._pointsGroup)

    // line object placeholder
    this._lineObject = null

    // observe resize
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width || 1
        const height = entry.contentRect.height || 1
        const aspect2 = width / height || 1
        // keep vertical size constant
        const d2 = d
        this.camera.left = -d2 * aspect2
        this.camera.right = d2 * aspect2
        this.camera.top = d2
        this.camera.bottom = -d2
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(width, height, false)
        this._render()
      }
    })
    this.resizeObserver.observe(this.container)
  }

  _bindEvents() {
    const canvas = this.renderer.domElement
    this._pointerDown = this._onPointerDown.bind(this)
    this._pointerMove = this._onPointerMove.bind(this)
    this._pointerUp = this._onPointerUp.bind(this)
    this._dblClick = this._onDblClick.bind(this)
    this._wheel = this._onWheel.bind(this)
    this._canvasMove = this._onCanvasPointerMove.bind(this)

    canvas.addEventListener('pointerdown', this._pointerDown)
    window.addEventListener('pointermove', this._pointerMove)
    window.addEventListener('pointerup', this._pointerUp)
    canvas.addEventListener('pointermove', this._canvasMove)
    canvas.addEventListener('dblclick', this._dblClick)
    canvas.addEventListener('wheel', this._wheel, { passive: false })
  }

  _unbindEvents() {
    const canvas = this.renderer.domElement
    canvas.removeEventListener('pointerdown', this._pointerDown)
    window.removeEventListener('pointermove', this._pointerMove)
    window.removeEventListener('pointerup', this._pointerUp)
    canvas.removeEventListener('pointermove', this._canvasMove)
    canvas.removeEventListener('dblclick', this._dblClick)
    canvas.removeEventListener('wheel', this._wheel)
  }

  _onPointerDown(e) {
    if (e.button !== 0) {
      // for now only left-button interactions
    }
    const pos = this._getWorldCoords(e)
    const hit = this._findPointIndexNear(pos)
    if (hit !== -1 && e.button === 0) {
      this._dragIndex = hit
      this._isDragging = true
    } else {
      // start panning
      this._isPanning = true
      this._panStart.set(e.clientX, e.clientY)
      this._cameraStartPos.copy(this.camera.position)
    }
  }

  _onPointerMove(e) {
    if (this._isDragging && this._dragIndex !== null) {
      const pos = this._getWorldCoords(e)
      this.points[this._dragIndex] = [pos.x, pos.y]
      this.updateGeometry()
      this._render()
    } else if (this._isPanning) {
      const dx = e.clientX - this._panStart.x
      const dy = e.clientY - this._panStart.y
      const size = this.renderer.getSize(new THREE.Vector2())
      const width = this.camera.right - this.camera.left
      const height = this.camera.top - this.camera.bottom
      const moveX = -dx / size.x * width
      const moveY = dy / size.y * height
      this.camera.position.set(
        this._cameraStartPos.x + moveX,
        this._cameraStartPos.y + moveY,
        this._cameraStartPos.z
      )
      this.camera.updateProjectionMatrix()
      this._render()
    }
  }

  _onPointerUp() {
    if (this._isDragging) {
      this._isDragging = false
      this._dragIndex = null
      this._emitChange()
    }
    if (this._isPanning) {
      this._isPanning = false
    }
  }

  _onDblClick(e) {
    // use same logic for add/remove
    const pos = this._getWorldCoords(e)
    const hit = this._findPointIndexNear(pos)
    if (hit !== -1) {
      this.removePoint(hit)
    } else if (e.button === 0) {
      this.addPoint([pos.x, pos.y])
    }
  }

  _onWheel(e) {
    e.preventDefault()
    const factor = 1 + (e.deltaY > 0 ? -0.1 : 0.1)
    this.camera.zoom = Math.max(0.1, Math.min(20, this.camera.zoom * factor))
    this.camera.updateProjectionMatrix()
    this._render()
  }

  _onCanvasPointerMove(e) {
    // highlight hovered point and update cursor
    const pos = this._getWorldCoords(e)
    const hit = this._findPointIndexNear(pos)
    const canvas = this.renderer.domElement
    if (hit !== -1) {
      canvas.style.cursor = this._isDragging ? 'grabbing' : 'grab'
    } else {
      canvas.style.cursor = 'crosshair'
    }

    if (hit !== this._hoverIndex) {
      // restore previous
      if (this._hoverIndex !== null && this._pointsGroup.children[this._hoverIndex]) {
        // <-- restore to new base голубой цвет
        this._pointsGroup.children[this._hoverIndex].material.color.set(0x89cffa)
      }
      if (hit !== -1) {
        // highlight with the existing highlight color
        this._pointsGroup.children[hit].material.color.set(0x4a90e2)
      }
      this._hoverIndex = hit
      this._render()
    }
  }

  _getWorldCoords(event) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    const mouse = new THREE.Vector2(x, y)
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const intersect = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, intersect)
    return intersect
  }

  _findPointIndexNear(vec3) {
    const threshold = 0.3
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i]
      const dx = vec3.x - p[0]
      const dy = vec3.y - p[1]
      if (dx * dx + dy * dy < threshold * threshold) {
        return i
      }
    }
    return -1
  }

  addPoint(pt) {
    const newPt = [Math.round(pt[0] * 10) / 10, Math.round(pt[1] * 10) / 10]

    // If there are fewer than 2 points, just append
    if (this.points.length < 2) {
      this.points.push(newPt)
    } else {
      // Find best segment (between consecutive points) to insert into.
      // For polygon treat segments cyclically; for polyline consider only 0..n-2.
      const x = newPt[0], y = newPt[1]
      let bestIdx = this.points.length // default: push to end
      let bestDist = Infinity
      const n = this.points.length
      const segCount = this.isPolygon ? n : n - 1
      for (let i = 0; i < segCount; i++) {
        const a = this.points[i]
        const b = this.points[(i + 1) % n]
        const vx = b[0] - a[0]
        const vy = b[1] - a[1]
        const wx = x - a[0]
        const wy = y - a[1]
        const c = vx * wx + vy * wy
        const vv = vx * vx + vy * vy
        let t = 0
        if (vv > 0) t = Math.max(0, Math.min(1, c / vv))
        const projx = a[0] + vx * t
        const projy = a[1] + vy * t
        const dx = x - projx
        const dy = y - projy
        const d2 = dx * dx + dy * dy
        if (d2 < bestDist) {
          bestDist = d2
          bestIdx = i + 1
        }
      }
      // insert at bestIdx (between points[bestIdx-1] and points[bestIdx])
      this.points.splice(bestIdx, 0, newPt)
    }

    this.updateGeometry()
    this._render()
    this._emitChange()
  }

  removePoint(idx) {
    const minCount = this.isPolygon ? 3 : 2
    if (this.points.length <= minCount) return
    this.points.splice(idx, 1)
    this.updateGeometry()
    this._render()
    this._emitChange()
  }

  resetPoints() {
    this.points = [[-1, 0], [1, 0]]
    this.updateGeometry()
    this._render()
    this._emitChange()
  }

  updateGeometry() {
    // rebuild line object
    if (this._lineObject) {
      this.scene.remove(this._lineObject)
      this._lineObject.geometry.dispose()
    }

    if (this.points.length >= 2) {
      const pts = this.points.map((p) => new THREE.Vector3(p[0], p[1], 0.01))
      const geom = new THREE.BufferGeometry().setFromPoints(pts)
      this._lineObject = this.isPolygon
        ? new THREE.LineLoop(geom, this._lineMaterial)
        : new THREE.Line(geom, this._lineMaterial)
      this.scene.add(this._lineObject)
    }

    // rebuild points group
    this._pointsGroup.clear()
    this.points.forEach((p) => {
      const mesh = new THREE.Mesh(this._pointGeom, this._pointMaterial.clone())
      mesh.position.set(p[0], p[1], 0.02)
      this._pointsGroup.add(mesh)
    })
  }

  _emitChange() {
    this.onChange(this.points.slice())
  }

  _render() {
    this.renderer.render(this.scene, this.camera)
  }
}