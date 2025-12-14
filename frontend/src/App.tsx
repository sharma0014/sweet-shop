import './App.css'
import { useEffect, useMemo, useState } from 'react'
import { api, type Sweet, type User } from './api'

function App() {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('secret12')

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    try {
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  })

  const [sweets, setSweets] = useState<Sweet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newPrice, setNewPrice] = useState<number>(100)
  const [newQty, setNewQty] = useState<number>(1)

  const [searchName, setSearchName] = useState('')
  const [searchCategory, setSearchCategory] = useState('')
  const [searchMinPrice, setSearchMinPrice] = useState<number | ''>('')
  const [searchMaxPrice, setSearchMaxPrice] = useState<number | ''>('')

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editPrice, setEditPrice] = useState<number>(0)
  const [editQty, setEditQty] = useState<number>(0)

  const isAdmin = useMemo(() => user?.role === 'ADMIN', [user?.role])

  async function refresh() {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const list = await api.listSweets(token)
      setSweets(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sweets')
    } finally {
      setLoading(false)
    }
  }

  async function onSearch() {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const list = await api.searchSweets(token, {
        name: searchName.trim() || undefined,
        category: searchCategory.trim() || undefined,
        minPrice: searchMinPrice === '' ? undefined : Number(searchMinPrice),
        maxPrice: searchMaxPrice === '' ? undefined : Number(searchMaxPrice),
      })
      setSweets(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function onRegister() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.register(email, password)
      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      setToken(res.token)
      setUser(res.user)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Register failed')
    } finally {
      setLoading(false)
    }
  }

  async function onLogin() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.login(email, password)
      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      setToken(res.token)
      setUser(res.user)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  function onLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setSweets([])
    setError(null)
  }

  async function onCreateSweet() {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await api.createSweet(token, {
        name: newName.trim(),
        category: newCategory.trim(),
        price: Number(newPrice),
        quantity: Number(newQty),
      })
      setNewName('')
      setNewCategory('')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setLoading(false)
    }
  }

  async function onPurchase(id: string) {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await api.purchaseSweet(token, id, 1)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed')
    } finally {
      setLoading(false)
    }
  }

  async function onRestock(id: string) {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await api.restockSweet(token, id, 5)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restock failed')
    } finally {
      setLoading(false)
    }
  }

  async function onDelete(id: string) {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      await api.deleteSweet(token, id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(s: Sweet) {
    setEditId(s.id)
    setEditName(s.name)
    setEditCategory(s.category)
    setEditPrice(s.price)
    setEditQty(s.quantity)
  }

  function cancelEdit() {
    setEditId(null)
    setEditName('')
    setEditCategory('')
    setEditPrice(0)
    setEditQty(0)
  }

  async function onSaveEdit() {
    if (!token || !editId) return
    setLoading(true)
    setError(null)
    try {
      await api.updateSweet(token, editId, {
        name: editName.trim(),
        category: editCategory.trim(),
        price: Number(editPrice),
        quantity: Number(editQty),
      })
      cancelEdit()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Sweet Shop</h1>
        <div className="headerRight">
          {user ? (
            <>
              <div className="muted">
                Signed in as <strong>{user.email}</strong> ({user.role})
              </div>
              <button onClick={onLogout} disabled={loading}>
                Logout
              </button>
            </>
          ) : (
            <div className="muted">Not signed in</div>
          )}
        </div>
      </header>

      <section className="card">
        <h2>Auth</h2>
        <div className="row">
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="min 6 chars"
            />
          </label>
        </div>
        <div className="row">
          <button onClick={onRegister} disabled={loading}>
            Register
          </button>
          <button onClick={onLogin} disabled={loading}>
            Login
          </button>
          <button onClick={refresh} disabled={!token || loading}>
            Refresh sweets
          </button>
        </div>
        {error ? <div className="error">{error}</div> : null}
      </section>

      <section className="card">
        <h2>Sweets</h2>
        {!token ? (
          <div className="muted">Login/register to view and manage sweets.</div>
        ) : (
          <>
            {isAdmin ? (
              <div className="row">
                <div className="muted" style={{ minWidth: 160 }}>
                  Admin actions
                </div>
                {editId ? (
                  <>
                    <label>
                      Edit name
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </label>
                    <label>
                      Edit category
                      <input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
                    </label>
                    <label>
                      Edit price
                      <input
                        value={editPrice}
                        onChange={(e) => setEditPrice(Number(e.target.value))}
                        type="number"
                        min={0}
                      />
                    </label>
                    <label>
                      Edit qty
                      <input
                        value={editQty}
                        onChange={(e) => setEditQty(Number(e.target.value))}
                        type="number"
                        min={0}
                      />
                    </label>
                    <div className="actions">
                      <button onClick={onSaveEdit} disabled={loading}>
                        Save
                      </button>
                    </div>
                    <div className="actions">
                      <button onClick={cancelEdit} disabled={loading}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="muted">Click “Edit” on a sweet below.</div>
                )}
              </div>
            ) : null}

            <div className="row">
              <label>
                Search name
                <input value={searchName} onChange={(e) => setSearchName(e.target.value)} />
              </label>
              <label>
                Search category
                <input value={searchCategory} onChange={(e) => setSearchCategory(e.target.value)} />
              </label>
              <label>
                Min price
                <input
                  value={searchMinPrice}
                  onChange={(e) => {
                    const v = e.target.value
                    setSearchMinPrice(v === '' ? '' : Number(v))
                  }}
                  type="number"
                  min={0}
                />
              </label>
              <label>
                Max price
                <input
                  value={searchMaxPrice}
                  onChange={(e) => {
                    const v = e.target.value
                    setSearchMaxPrice(v === '' ? '' : Number(v))
                  }}
                  type="number"
                  min={0}
                />
              </label>
              <div className="actions">
                <button onClick={onSearch} disabled={loading}>
                  Search
                </button>
              </div>
              <div className="actions">
                <button onClick={refresh} disabled={loading}>
                  Reset
                </button>
              </div>
            </div>

            <div className="row">
              <label>
                Name
                <input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </label>
              <label>
                Category
                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
              </label>
              <label>
                Price (cents)
                <input
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  type="number"
                  min={0}
                />
              </label>
              <label>
                Qty
                <input
                  value={newQty}
                  onChange={(e) => setNewQty(Number(e.target.value))}
                  type="number"
                  min={0}
                />
              </label>
              <div className="actions">
                <button onClick={onCreateSweet} disabled={loading}>
                  Add
                </button>
              </div>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sweets.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.category}</td>
                      <td>{s.price}</td>
                      <td>{s.quantity}</td>
                      <td className="actionsCell">
                        <button onClick={() => onPurchase(s.id)} disabled={loading || s.quantity === 0}>
                          Buy 1
                        </button>
                        {isAdmin ? (
                          <>
                            <button onClick={() => startEdit(s)} disabled={loading}>
                              Edit
                            </button>
                            <button onClick={() => onRestock(s.id)} disabled={loading}>
                              Restock +5
                            </button>
                            <button onClick={() => onDelete(s.id)} disabled={loading}>
                              Delete
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {sweets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">
                        {loading ? 'Loading…' : 'No sweets yet.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default App
