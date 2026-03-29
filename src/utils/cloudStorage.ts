import cloudbase from '@cloudbase/js-sdk';

// 获取环境 ID（从 URL 参数或默认配置）
function getEnvId(): string {
  // 优先从 URL 参数获取
  const urlParams = new URLSearchParams(window.location.search);
  const envId = urlParams.get('envId');
  if (envId) return envId;

  // 从 meta 标签获取
  const metaEnv = document.querySelector('meta[name="cloudbase-env-id"]');
  if (metaEnv) {
    return metaEnv.getAttribute('content') || '';
  }

  // 默认环境 ID（需要用户在 CloudBase 控制台配置）
  return 'test-9gxg636q2a60a065';
}

// 初始化 CloudBase 应用
let appInstance: ReturnType<typeof cloudbase.init> | null = null;
let authInitialized = false;

async function initAuth() {
  if (authInitialized) return;
  
  const envId = getEnvId();
  if (!envId || envId === 'your-env-id') {
    console.warn('CloudBase 环境 ID 未配置');
    return;
  }
  
  appInstance = cloudbase.init({ env: envId });
  
  try {
    const auth = appInstance.auth();
    await auth.signInAnonymously();
    authInitialized = true;
    console.log('云存储匿名登录成功');
  } catch (error) {
    if ((error as any)?.message?.includes('102')) {
      authInitialized = true;
    } else {
      console.warn('云存储匿名登录失败:', error);
    }
  }
}

export function getCloudBaseApp() {
  if (!appInstance) {
    const envId = getEnvId();
    if (!envId || envId === 'your-env-id') {
      return null;
    }
    appInstance = cloudbase.init({
      env: envId,
    });
  }
  return appInstance;
}

// 上传文件到云存储
export async function uploadToCloudStorage(
  cloudPath: string,
  fileOrBlob: File | Blob | string
): Promise<{ fileID: string; tempFileURL: string } | null> {
  await initAuth();
  const app = getCloudBaseApp();
  if (!app) return null;

  try {
    // 确保文件是 File 对象
    let fileObj: File;
    if (typeof fileOrBlob === 'string') {
      // 如果是 dataURL，转换为 File
      const arr = fileOrBlob.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      fileObj = new File([u8arr], cloudPath, { type: mime });
    } else if (fileOrBlob instanceof Blob) {
      fileObj = new File([fileOrBlob], cloudPath, { type: fileOrBlob.type || 'application/octet-stream' });
    } else {
      // fileOrBlob 本身是 File 类型
      fileObj = fileOrBlob as File;
    }

    const result = await app.uploadFile({
      cloudPath: cloudPath,
      filePath: fileObj as any, // SDK 类型定义可能有误，实际支持 File 对象
    });

    // 获取临时下载链接
    const urlResult = await app.getTempFileURL({
      fileList: [{ fileID: result.fileID, maxAge: 86400 }],
    });

    if (urlResult.fileList && urlResult.fileList[0]?.code === 'SUCCESS') {
      return {
        fileID: result.fileID,
        tempFileURL: urlResult.fileList[0].tempFileURL,
      };
    }

    return { fileID: result.fileID, tempFileURL: '' };
  } catch (error) {
    console.error('云存储上传失败:', error);
    return null;
  }
}

// 下载文件（触发浏览器下载）
export async function downloadFromCloudStorage(fileID: string, fileName?: string): Promise<void> {
  await initAuth();
  const app = getCloudBaseApp();
  if (!app) return;

  try {
    const result = await app.getTempFileURL({
      fileList: [{ fileID, maxAge: 3600 }],
    });

    if (result.fileList && result.fileList[0]?.code === 'SUCCESS') {
      const url = result.fileList[0].tempFileURL;
      // 触发下载
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || '';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    console.error('云存储下载失败:', error);
  }
}
