import { getTianapiKey } from './apiKeys';

const TIANAPI_BASE = 'https://apis.tianapi.com/lunar/index';

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeap: boolean;
}

interface TianAPIResponse {
  code: number;
  msg: string;
  result: {
    lunardate: string;           // 农历日期
    tiangandizhiyear: string;    // 年干支
    tiangandizhimonth: string;   // 月干支
    tiangandizhiday: string;     // 日干支
    lubarmonth: string;          // 农历月份（如"正月"）
    lunarday: string;            // 农历日期（如"十五"）
  };
}

export class Calendar {
  private static async fetchTianAPI(date: Date): Promise<TianAPIResponse> {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // 获取用户设置的API密钥
    const apiKey = getTianapiKey();
    
    // 格式化日期字符串，确保月份和日期是两位数
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    console.log('Requesting TianAPI with date:', dateStr);
    
    const response = await fetch(
      `${TIANAPI_BASE}?key=${apiKey}&date=${dateStr}`
    );
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data: TianAPIResponse = await response.json();
    
    if (data.code !== 200) {
      throw new Error(data.msg || 'API请求失败');
    }

    if (!data.result) {
      throw new Error('API返回数据格式错误');
    }
    
    console.log('TianAPI response:', data);
    
    return data;
  }

  // 获取农历数据
  public static async solarToLunar(date: Date): Promise<LunarDate> {
    try {
      const data = await this.fetchTianAPI(date);
      
      // 从API返回的农历日期字符串中解析年月日
      const [year, month, day] = data.result.lunardate.split('-').map(Number);
      
      return {
        year,
        month,
        day,
        isLeap: data.result.lubarmonth.includes('闰')
      };
    } catch (error) {
      console.error('获取农历日期失败:', error);
      throw error;
    }
  }

  // 获取干支信息
  public static async getGanZhi(date: Date): Promise<{
    year: string;
    month: string;
    day: string;
  }> {
    try {
      const data = await this.fetchTianAPI(date);
      
      const { tiangandizhiyear, tiangandizhimonth, tiangandizhiday } = data.result;
      
      if (!tiangandizhiyear || !tiangandizhimonth || !tiangandizhiday) {
        throw new Error('干支数据不完整');
      }

      console.log('干支数据:', {
        year: tiangandizhiyear,
        month: tiangandizhimonth,
        day: tiangandizhiday
      });

      return {
        year: tiangandizhiyear,
        month: tiangandizhimonth,
        day: tiangandizhiday
      };
    } catch (error) {
      console.error('获取干支数据失败:', error);
      throw error;
    }
  }
}