import axios from 'axios'

// API 基础URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// 创建 axios 实例
const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

interface User {
  id: string
  email: string
  username: string
  is_active: boolean
  created_at: string
}

interface RegisterData {
  email: string
  username: string
  password: string
}

interface LoginData {
  username: string
  password: string
}

interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

interface BookmarkCreateData {
  demand_id: string
  custom_notes?: string
  custom_tags?: string[]
  custom_category?: string
}

interface BookmarkUpdateData {
  custom_notes?: string
  custom_tags?: string[]
  custom_category?: string
}

interface BookmarkResponse {
  id: string
  user_id: string
  demand: any
  custom_notes: string | null
  custom_tags: string[]
  custom_category: string | null
  created_at: string
}

// ============================================================================
// 认证 API
// ============================================================================

/**
 * 用户注册
 */
export async function register(data: RegisterData): Promise<TokenResponse> {
  const response = await authApi.post<TokenResponse>('/auth/register', data)
  return response.data
}

/**
 * 用户登录
 */
export async function login(data: LoginData): Promise<TokenResponse> {
  const response = await authApi.post<TokenResponse>('/auth/login', data)
  return response.data
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(token: string): Promise<User> {
  const response = await authApi.get<User>('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

// ============================================================================
// 收藏 API
// ============================================================================

/**
 * 创建收藏
 */
export async function createBookmark(
  data: BookmarkCreateData,
  token: string
): Promise<BookmarkResponse> {
  const response = await authApi.post<BookmarkResponse>('/bookmarks/', data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

/**
 * 获取收藏列表
 */
export async function getBookmarks(token: string): Promise<BookmarkResponse[]> {
  const response = await authApi.get<BookmarkResponse[]>('/bookmarks/', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

/**
 * 获取单个收藏
 */
export async function getBookmark(
  bookmarkId: string,
  token: string
): Promise<BookmarkResponse> {
  const response = await authApi.get<BookmarkResponse>(`/bookmarks/${bookmarkId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

/**
 * 更新收藏
 */
export async function updateBookmark(
  bookmarkId: string,
  data: BookmarkUpdateData,
  token: string
): Promise<BookmarkResponse> {
  const response = await authApi.put<BookmarkResponse>(`/bookmarks/${bookmarkId}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data
}

/**
 * 删除收藏
 */
export async function deleteBookmark(
  bookmarkId: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  const response = await authApi.delete<{ success: boolean; message: string }>(
    `/bookmarks/${bookmarkId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
  return response.data
}

/**
 * 检查是否已收藏
 */
export async function checkBookmarked(
  demandId: string,
  token: string | null
): Promise<{ bookmarked: boolean; bookmark_id: string | null }> {
  if (!token) {
    return { bookmarked: false, bookmark_id: null }
  }

  const response = await authApi.get<{ bookmarked: boolean; bookmark_id: string | null }>(
    `/bookmarks/check/${demandId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )
  return response.data
}

export default authApi
