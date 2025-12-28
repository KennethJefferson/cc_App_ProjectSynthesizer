# Code Patterns Reference

Common code patterns and structures by tech stack. Use these as foundations when generating project code.

## React Patterns

### Main Entry Point (Vite)

```jsx
// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

### App Component

```jsx
// src/App.jsx
import { useState } from 'react'
import Header from './components/Header'
import Main from './components/Main'
import Footer from './components/Footer'
import './styles/App.css'

function App() {
  const [state, setState] = useState(initialValue)

  return (
    <div className="app">
      <Header />
      <Main state={state} setState={setState} />
      <Footer />
    </div>
  )
}

export default App
```

### Functional Component

```jsx
// src/components/ComponentName.jsx
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import './ComponentName.css'

function ComponentName({ prop1, prop2, onAction }) {
  const [localState, setLocalState] = useState(null)

  useEffect(() => {
    // Side effect logic
    return () => {
      // Cleanup
    }
  }, [dependency])

  const handleClick = () => {
    onAction(localState)
  }

  return (
    <div className="component-name">
      <h2>{prop1}</h2>
      <p>{prop2}</p>
      <button onClick={handleClick}>Action</button>
    </div>
  )
}

ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.string,
  onAction: PropTypes.func.isRequired,
}

ComponentName.defaultProps = {
  prop2: 'Default value',
}

export default ComponentName
```

### Custom Hook

```jsx
// src/hooks/useCustomHook.js
import { useState, useEffect } from 'react'

function useCustomHook(initialValue) {
  const [value, setValue] = useState(initialValue)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Effect logic
  }, [value])

  const updateValue = (newValue) => {
    setValue(newValue)
  }

  return { value, loading, error, updateValue }
}

export default useCustomHook
```

### useLocalStorage Hook

```jsx
// src/hooks/useLocalStorage.js
import { useState, useEffect } from 'react'

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue]
}

export default useLocalStorage
```

### Context Provider

```jsx
// src/context/AppContext.jsx
import { createContext, useContext, useReducer } from 'react'

const AppContext = createContext(null)
const AppDispatchContext = createContext(null)

const initialState = {
  // Initial state
}

function appReducer(state, action) {
  switch (action.type) {
    case 'ACTION_TYPE':
      return { ...state, /* updates */ }
    default:
      throw new Error(`Unknown action: ${action.type}`)
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppContext.Provider>
  )
}

export function useAppState() {
  const context = useContext(AppContext)
  if (context === null) {
    throw new Error('useAppState must be used within AppProvider')
  }
  return context
}

export function useAppDispatch() {
  const context = useContext(AppDispatchContext)
  if (context === null) {
    throw new Error('useAppDispatch must be used within AppProvider')
  }
  return context
}
```

### API Service

```jsx
// src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function handleResponse(response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

export async function fetchItems() {
  const response = await fetch(`${API_BASE_URL}/items`)
  return handleResponse(response)
}

export async function createItem(data) {
  const response = await fetch(`${API_BASE_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(response)
}

export async function updateItem(id, data) {
  const response = await fetch(`${API_BASE_URL}/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return handleResponse(response)
}

export async function deleteItem(id) {
  const response = await fetch(`${API_BASE_URL}/items/${id}`, {
    method: 'DELETE',
  })
  return handleResponse(response)
}
```

---

## Node.js / Express Patterns

### Main Entry Point

```javascript
// src/index.js
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
require('dotenv').config()

const routes = require('./routes')
const errorHandler = require('./middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api', routes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app
```

### Route File

```javascript
// src/routes/items.js
const express = require('express')
const router = express.Router()
const itemController = require('../controllers/itemController')
const { validateItem } = require('../middleware/validation')
const auth = require('../middleware/auth')

router.get('/', itemController.getAll)
router.get('/:id', itemController.getById)
router.post('/', auth, validateItem, itemController.create)
router.put('/:id', auth, validateItem, itemController.update)
router.delete('/:id', auth, itemController.delete)

module.exports = router
```

### Controller

```javascript
// src/controllers/itemController.js
const Item = require('../models/Item')

const itemController = {
  async getAll(req, res, next) {
    try {
      const items = await Item.findAll()
      res.json({ success: true, data: items })
    } catch (error) {
      next(error)
    }
  },

  async getById(req, res, next) {
    try {
      const item = await Item.findById(req.params.id)
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' })
      }
      res.json({ success: true, data: item })
    } catch (error) {
      next(error)
    }
  },

  async create(req, res, next) {
    try {
      const item = await Item.create(req.body)
      res.status(201).json({ success: true, data: item })
    } catch (error) {
      next(error)
    }
  },

  async update(req, res, next) {
    try {
      const item = await Item.findByIdAndUpdate(req.params.id, req.body)
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' })
      }
      res.json({ success: true, data: item })
    } catch (error) {
      next(error)
    }
  },

  async delete(req, res, next) {
    try {
      const item = await Item.findByIdAndDelete(req.params.id)
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' })
      }
      res.json({ success: true, message: 'Item deleted' })
    } catch (error) {
      next(error)
    }
  },
}

module.exports = itemController
```

### Error Handler Middleware

```javascript
// src/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error(err.stack)

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

module.exports = errorHandler
```

### Auth Middleware (JWT)

```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken')

function auth(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

module.exports = auth
```

### Validation Middleware

```javascript
// src/middleware/validation.js
const validateItem = (req, res, next) => {
  const { name, description } = req.body
  const errors = []

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string')
  }

  if (description && typeof description !== 'string') {
    errors.push('Description must be a string')
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors })
  }

  next()
}

module.exports = { validateItem }
```

---

## Python / Flask Patterns

### Main Application

```python
# app/__init__.py
from flask import Flask
from flask_cors import CORS
from config import Config

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    CORS(app)
    
    # Register blueprints
    from app.routes import main_bp, api_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {'error': 'Internal server error'}, 500
    
    return app
```

### Route Blueprint

```python
# app/routes/api.py
from flask import Blueprint, request, jsonify
from app.models import Item
from app.utils.validators import validate_item

api_bp = Blueprint('api', __name__)

@api_bp.route('/items', methods=['GET'])
def get_items():
    items = Item.get_all()
    return jsonify({'success': True, 'data': [item.to_dict() for item in items]})

@api_bp.route('/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    item = Item.get_by_id(item_id)
    if not item:
        return jsonify({'success': False, 'message': 'Item not found'}), 404
    return jsonify({'success': True, 'data': item.to_dict()})

@api_bp.route('/items', methods=['POST'])
def create_item():
    data = request.get_json()
    errors = validate_item(data)
    if errors:
        return jsonify({'success': False, 'errors': errors}), 400
    
    item = Item.create(**data)
    return jsonify({'success': True, 'data': item.to_dict()}), 201

@api_bp.route('/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    item = Item.get_by_id(item_id)
    if not item:
        return jsonify({'success': False, 'message': 'Item not found'}), 404
    
    data = request.get_json()
    errors = validate_item(data)
    if errors:
        return jsonify({'success': False, 'errors': errors}), 400
    
    item.update(**data)
    return jsonify({'success': True, 'data': item.to_dict()})

@api_bp.route('/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    item = Item.get_by_id(item_id)
    if not item:
        return jsonify({'success': False, 'message': 'Item not found'}), 404
    
    item.delete()
    return jsonify({'success': True, 'message': 'Item deleted'})
```

### Model

```python
# app/models/item.py
from datetime import datetime

class Item:
    _items = []  # In-memory storage (replace with database)
    _next_id = 1
    
    def __init__(self, name, description=None):
        self.id = Item._next_id
        Item._next_id += 1
        self.name = name
        self.description = description
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
    
    def update(self, **kwargs):
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        self.updated_at = datetime.utcnow()
    
    def delete(self):
        Item._items.remove(self)
    
    @classmethod
    def create(cls, **kwargs):
        item = cls(**kwargs)
        cls._items.append(item)
        return item
    
    @classmethod
    def get_all(cls):
        return cls._items
    
    @classmethod
    def get_by_id(cls, item_id):
        return next((item for item in cls._items if item.id == item_id), None)
```

### Config

```python
# config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    # Database
    DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
```

### Run Script

```python
# run.py
from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000)),
        debug=app.config['DEBUG']
    )
```

---

## TypeScript Patterns

### Type Definitions

```typescript
// src/types/index.ts
export interface Item {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export type CreateItemDTO = Omit<Item, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateItemDTO = Partial<CreateItemDTO>;
```

### Typed Hook

```typescript
// src/hooks/useApi.ts
import { useState, useCallback } from 'react';
import type { ApiResponse } from '../types';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<ApiResponse<T>>) => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const response = await apiCall();
      if (response.success && response.data) {
        setState({ data: response.data, loading: false, error: null });
      } else {
        setState({ data: null, loading: false, error: response.message || 'Unknown error' });
      }
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }, []);

  return { ...state, execute };
}

export default useApi;
```

---

## Common Utilities

### Date Formatting

```javascript
// src/utils/date.js
export function formatDate(date, options = {}) {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  })
}

export function formatDateTime(date) {
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ]
  
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds)
    if (count >= 1) {
      return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`
    }
  }
  
  return 'just now'
}
```

### ID Generation

```javascript
// src/utils/id.js
export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`
}

export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
```

### Debounce

```javascript
// src/utils/debounce.js
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
```

### Local Storage Helpers

```javascript
// src/utils/storage.js
export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  },

  clear() {
    try {
      localStorage.clear()
      return true
    } catch {
      return false
    }
  },
}
```
