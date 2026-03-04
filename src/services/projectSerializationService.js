import { ShapeRegistry } from '@/editor_core/3D_editor/entities/ShapeRegistry'
import { getGlobalEngineRegistry } from '@/editor_core/general/engine/EngineRegistry'

/**
 * Serialization service for saving and loading project state
 */
export const projectSerializationService = {
  /**
   * Serialize current editor state to JSON string
   */
  serializeProject() {
    console.log('[->] projectSerializationService: serializeProject()')
    const data = {
      version: '1.0',
      shapes: [],
      unfoldings: [],
      connections: []
    }

    // Serialize 3D shapes
    const ERs = getGlobalEngineRegistry() || store.engineRegistry
    if (ERs?.shapeSystem) {
      for (const [shapeId, entity] of ERs.shapeSystem.entities.entries()) {
        if (entity && entity.mesh && entity.owner) {
          data.shapes.push({
            id: shapeId,
            type: entity.mesh.userData.shapeType || 'unknown',
            params: { ...entity.mesh.userData.params }
          })
        }
      }
    }

    // Serialize 2D unfoldings
    if (ERs?.unfoldSystem) {
      const unfoldings = ERs.unfoldSystem.getAll()
      unfoldings.forEach(unfold => {
        if (unfold && unfold.mesh && unfold.mesh.userData.unfoldId) {
          data.unfoldings.push({
            id: unfold.mesh.userData.unfoldId,
            parentShapeId: unfold.mesh.userData.parentShapeId,
            unfoldParams: { ...unfold.mesh.userData.unfoldParams }
          })
        }
      })
    }

    // Serialize connections
    if (ERs?.connectionSystem) {
      ERs.connectionSystem.connections.forEach(conn => {
        data.connections.push({
          id: conn.id,
          type: conn.type,
          parentId: conn.parentId,
          parentEdgeIndex: conn.parentEdgeIndex,
          childId: conn.childId,
          childEdgeIndex: conn.childEdgeIndex
        })
      })
    }

    return JSON.stringify(data)
  },

  /**
   * Deserialize JSON string to editor state
   */
  async deserializeProject(jsonString) {
    console.log('[->] projectSerializationService: deserializeProject()')
    try {
      // Handle empty project
      if (!jsonString || jsonString === '{}' || jsonString.trim() === '') {
        // Return empty project structure
        const ER_empty = getGlobalEngineRegistry() || store.engineRegistry
        ER_empty?.historySystem?.clear()
        ER_empty?.shapeSystem?.entities?.clear()
        ER_empty?.unfoldSystem?.clear()
        if (ER_empty?.connectionSystem) ER_empty.connectionSystem.connections = []
        return {
          version: '1.0',
          shapes: [],
          unfoldings: [],
          connections: []
        }
      }

      const data = JSON.parse(jsonString)
      
      // Validate version
      if (!data.version) {
        throw new Error('Invalid project format: missing version')
      }
      
      // Clear current state (reset engines) safely
      const ER = getGlobalEngineRegistry() || store.engineRegistry
      ER?.historySystem?.clear()
      ER?.shapeSystem?.entities?.clear()
      ER?.unfoldSystem?.clear()
      if (ER?.connectionSystem) ER.connectionSystem.connections = []

      // Restore shapes
      if (data.shapes && Array.isArray(data.shapes)) {
        for (const shapeData of data.shapes) {
          try {
            await this._createShapeFromData(shapeData)
          } catch (error) {
            console.error('Error creating shape:', error, shapeData)
          }
        }
      }

      // Restore connections (after all shapes are created)
      if (data.connections && Array.isArray(data.connections)) {
        const ER2 = getGlobalEngineRegistry() || store.engineRegistry
        for (const connData of data.connections) {
          try {
            if (ER2?.connectionSystem?.addConnection) {
              ER2.connectionSystem.addConnection(connData)
            } else if (ER2?.connectionSystem) {
              ER2.connectionSystem.connections.push(connData)
            }
          } catch (error) {
            console.error('Error creating connection:', error, connData)
          }
        }
        ER2?.emitter?.emit('connections:changed', ER2?.connectionSystem?.connections || [])
      }

      // Restore unfoldings (after all shapes and connections)
      if (data.unfoldings && Array.isArray(data.unfoldings)) {
        for (const unfoldData of data.unfoldings) {
          try {
            this._applyUnfoldParameters(unfoldData)
          } catch (error) {
            console.error('Error applying unfold parameters:', error, unfoldData)
          }
        }
      }

      // Trigger a rebuild/sync if engines are available
      const ER3 = getGlobalEngineRegistry() || store.engineRegistry
      try { ER3?.syncSystem?.rebuildAllFrom3D() } catch (e) { /* ignore */ }

      return data
    } catch (error) {
      console.error('Error deserializing project:', error)
      throw new Error('Failed to load project: ' + error.message)
    }
  },

  /**
   * Create a shape from serialized data
   */
  async _createShapeFromData(shapeData) {
    console.log('[->] projectSerializationService: _createShapeFromData()')
    // Create shape instance
    const shape = ShapeRegistry.create(shapeData.type, shapeData.params)
    
    // Create mesh
    const mesh = shape.createMesh()
    
    // Add to engine scene if available (engine may not be initialized yet)
    const ER = getGlobalEngineRegistry() || store.engineRegistry
    if (ER?.engine3D && ER.engine3D.sceneSystem3D) {
      ER.engine3D.sceneSystem3D.add(mesh)
    }

    // Override the UUID to match saved ID BEFORE registering
    mesh.uuid = shapeData.id

    // Ensure owner reference exists
    mesh.userData.owner = mesh.userData.owner || shape

    // Register in shape system with specific ID (use system helper)
    if (ER?.shapeSystem?.register) {
      ER.shapeSystem.register(mesh)
    } else if (ER?.shapeSystem) {
      ER.shapeSystem.entities.set(shapeData.id, { id: shapeData.id, mesh, owner: shape })
    }

    const entity = ER?.shapeSystem?.getById ? ER.shapeSystem.getById(shapeData.id) : { id: shapeData.id, mesh, owner: shape }

    return entity
  },

  /**
   * Apply unfold parameters to restore unfolding state
   */
  _applyUnfoldParameters(unfoldData) {
    console.log('[->] projectSerializationService: _applyUnfoldParameters()')
    const ER = getGlobalEngineRegistry() || store.engineRegistry
    const unfold = ER?.unfoldSystem?.getById ? ER.unfoldSystem.getById(unfoldData.id) : null
    
    if (unfold) {
      // Update stored parameters
      unfold.mesh.userData.unfoldParams = {
        ...unfold.mesh.userData.unfoldParams,
        ...unfoldData.unfoldParams
      }
      // Apply the transform
      unfold.applyStoredTransform()
    }
  },

  /**
   * Take a canvas screenshot for project preview
   */
  async generatePreview(canvas) {
    console.log('[->] projectSerializationService: generatePreview()')
    if (!canvas) {
      return null
    }
    
    try {
      // Используем JPEG с компрессией 0.7 (70% качества), 
      // чтобы JSON Payload не превышал лимиты Tomcat сервера при отправке (обычно 2MB).
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      
      // Удаляем префикс 'data:image/jpeg;base64,' и отдаем чистый Base64
      const base64 = dataUrl.split(',')[1];
      
      return base64;
    } catch (error) {
      console.error('Error generating preview:', error)
      return null
    }
  }
}
