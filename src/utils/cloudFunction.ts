import cloudbase from '@cloudbase/js-sdk';

// 获取环境 ID
function getEnvId(): string {
  const urlParams = new URLSearchParams(window.location.search);
  const envId = urlParams.get('envId');
  if (envId) return envId;

  const metaEnv = document.querySelector('meta[name="cloudbase-env-id"]');
  if (metaEnv) {
    return metaEnv.getAttribute('content') || '';
  }

  return 'test-9gxg636q2a60a065';
}

// 初始化 CloudBase 应用
let appInstance: any = null;
let authInitialized = false;

export async function initCloudBaseAuth(): Promise<boolean> {
  if (authInitialized) return true;

  const envId = getEnvId();
  appInstance = cloudbase.init({
    env: envId,
  });

  try {
    // 尝试匿名登录
    const auth = appInstance.auth();
    await auth.signInAnonymously();
    authInitialized = true;
    console.log('CloudBase 匿名登录成功');
    return true;
  } catch (error: any) {
    // 如果已经是登录状态（之前的匿名登录）
    const errorMsg = error?.message || '';
    if (errorMsg.includes('102') || errorMsg.includes('already')) {
      authInitialized = true;
      console.log('CloudBase 已登录');
      return true;
    }
    console.warn('CloudBase 匿名登录失败:', error);
    return false;
  }
}

export function getCloudBaseApp() {
  if (!appInstance) {
    const envId = getEnvId();
    appInstance = cloudbase.init({
      env: envId,
    });
  }
  return appInstance;
}

// 调用云函数
export async function callFunction<T = any>(
  name: string,
  data: Record<string, any>
): Promise<{ success: boolean; data?: T; error?: string }> {
  // 确保已初始化认证
  const authOk = await initCloudBaseAuth();
  console.log('CloudBase 认证状态:', authOk);

  const app = getCloudBaseApp();
  if (!app) {
    return { success: false, error: 'CloudBase 未初始化' };
  }

  try {
    console.log('调用云函数:', name, data);
    const result = await app.callFunction({
      name,
      data,
    });
    console.log('云函数原始返回:', result);

    if (result.errCode) {
      console.error('云函数调用失败:', result.errMsg);
      return { success: false, error: result.errMsg };
    }

    // 处理返回数据 - 可能是字符串或对象
    let response: { success: boolean; data?: T; error?: string };
    
    // 检查 result.data 是否存在
    if (result.data === undefined || result.data === null) {
      console.error('云函数返回数据为空:', result);
      return { success: false, error: '云函数返回数据为空' };
    }
    
    if (typeof result.data === 'string') {
      // 如果是字符串，尝试解析
      try {
        response = JSON.parse(result.data);
      } catch (e) {
        console.error('解析云函数返回数据失败:', result.data);
        return { success: false, error: '解析云函数返回数据失败' };
      }
    } else if (typeof result.data === 'object') {
      response = result.data as { success: boolean; data?: T; error?: string };
    } else {
      console.error('云函数返回数据类型未知:', typeof result.data, result.data);
      return { success: false, error: '云函数返回数据类型未知' };
    }

    console.log('云函数解析后数据:', response);

    // 确保返回格式正确
    if (!response || typeof response.success !== 'boolean') {
      console.error('云函数返回格式错误:', response);
      return { success: false, error: '云函数返回格式错误' };
    }

    return response;
  } catch (error: any) {
    console.error('云函数调用异常:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// 云函数名称
export const FUNCTION_NAME = 'inspectionOrder';