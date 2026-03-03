import EngineRegistry from '@/editor_core/general/engine/EngineRegistry'
import { ShapeRegistry } from '@/editor_core/3D_editor/entities/ShapeRegistry'

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
    for (const [shapeId, entity] of EngineRegistry.shapeSystem.entities.entries()) {
      if (entity && entity.mesh && entity.owner) {
        data.shapes.push({
          id: shapeId,
          type: entity.mesh.userData.shapeType || 'unknown',
          params: { ...entity.mesh.userData.params }
        })
      }
    }

    // Serialize 2D unfoldings
    const unfoldings = EngineRegistry.unfoldSystem.getAll()
    unfoldings.forEach(unfold => {
      if (unfold && unfold.mesh && unfold.mesh.userData.unfoldId) {
        data.unfoldings.push({
          id: unfold.mesh.userData.unfoldId,
          parentShapeId: unfold.mesh.userData.parentShapeId,
          unfoldParams: { ...unfold.mesh.userData.unfoldParams }
        })
      }
    })

    // Serialize connections
    EngineRegistry.connectionSystem.connections.forEach(conn => {
      data.connections.push({
        id: conn.id,
        type: conn.type,
        parentId: conn.parentId,
        parentEdgeIndex: conn.parentEdgeIndex,
        childId: conn.childId,
        childEdgeIndex: conn.childEdgeIndex
      })
    })

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
        EngineRegistry.historySystem.clear()
        EngineRegistry.shapeSystem.entities.clear()
        EngineRegistry.unfoldSystem.clear()
        EngineRegistry.connectionSystem.connections = []
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
      if (EngineRegistry.historySystem) EngineRegistry.historySystem.clear()
      if (EngineRegistry.shapeSystem) EngineRegistry.shapeSystem.entities.clear()
      if (EngineRegistry.unfoldSystem) EngineRegistry.unfoldSystem.clear()
      if (EngineRegistry.connectionSystem) EngineRegistry.connectionSystem.connections = []

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
        for (const connData of data.connections) {
          try {
            EngineRegistry.connectionSystem.connections.push(connData)
          } catch (error) {
            console.error('Error creating connection:', error, connData)
          }
        }
        EngineRegistry.emitter.emit('connections:changed', EngineRegistry.connectionSystem.connections)
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
    
    // Add to engine
    if (EngineRegistry.engine3D && EngineRegistry.engine3D.sceneSystem3D) {
      EngineRegistry.engine3D.sceneSystem3D.add(mesh)
    }

    // Register in shape system with specific ID
    const entity = {
      id: shapeData.id,
      mesh: mesh,
      owner: shape
    }
    
    // Override the UUID to match saved ID
    mesh.uuid = shapeData.id
    EngineRegistry.shapeSystem.entities.set(shapeData.id, entity)

    return entity
  },

  /**
   * Apply unfold parameters to restore unfolding state
   */
  _applyUnfoldParameters(unfoldData) {
    console.log('[->] projectSerializationService: _applyUnfoldParameters()')
    const unfold = EngineRegistry.unfoldSystem.getById(unfoldData.id)
    
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
