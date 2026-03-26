import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { testUsers, type User } from '../types/inspectionOrder';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isInspector: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateUser: (user: User) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  getUsers: () => User[];
}

const AuthContext = createContext<AuthContextType | null>(null);

const USERS_STORAGE_KEY = 'inspection_users';

function getStoredUsers(): User[] {
  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // 初始化测试用户
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(testUsers));
  return testUsers;
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    const users = getStoredUsers();
    const foundUser = users.find(u => u.username === username && u.password === password);

    if (!foundUser) {
      return { success: false, message: '用户名或密码错误' };
    }

    if (foundUser.status !== 'active') {
      return { success: false, message: '账号已被禁用，请联系管理员' };
    }

    setUser(foundUser);
    localStorage.setItem('currentUser', JSON.stringify(foundUser));
    return { success: true, message: '登录成功' };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const updateUser = (updatedUser: User) => {
    const users = getStoredUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      saveUsers(users);
      // 如果更新的是当前登录用户，更新本地状态
      if (user?.id === updatedUser.id) {
        setUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }
    }
  };

  const addUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<boolean> => {
    const users = getStoredUsers();
    // 检查用户名是否已存在
    if (users.some(u => u.username === userData.username)) {
      return false;
    }

    const newUser: User = {
      ...userData,
      id: `user_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);
    return true;
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    const users = getStoredUsers();
    const filteredUsers = users.filter(u => u.id !== id);
    if (filteredUsers.length === users.length) {
      return false;
    }
    saveUsers(filteredUsers);
    return true;
  };

  const getUsers = (): User[] => {
    return getStoredUsers();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isInspector: user?.role === 'inspector',
        login,
        logout,
        updateUser,
        addUser,
        deleteUser,
        getUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}