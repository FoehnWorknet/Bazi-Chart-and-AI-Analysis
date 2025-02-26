import { Calendar, LunarDate } from './calendar';

export const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 时辰对应表
const HOUR_TO_BRANCH_MAP: [number, string][] = [
  [1, '子'],   // 23:00-1:00
  [3, '丑'],   // 1:00-3:00
  [5, '寅'],   // 3:00-5:00
  [7, '卯'],   // 5:00-7:00
  [9, '辰'],   // 7:00-9:00
  [11, '巳'],  // 9:00-11:00
  [13, '午'],  // 11:00-13:00
  [15, '未'],  // 13:00-15:00
  [17, '申'],  // 15:00-17:00
  [19, '酉'],  // 17:00-19:00
  [21, '戌'],  // 19:00-21:00
  [23, '亥'],  // 21:00-23:00
];

export interface BaziPillar {
  stem: string;
  branch: string;
}

export interface BaziResult {
  year: BaziPillar;
  month: BaziPillar;
  day: BaziPillar;
  hour: BaziPillar;
  lunarDate: LunarDate;
}

// 从干支字符串中提取天干和地支
function splitGanZhi(ganZhi: string): BaziPillar {
  if (!ganZhi || ganZhi.length < 2) {
    throw new Error('无效的干支数据');
  }
  return {
    stem: ganZhi[0],
    branch: ganZhi[1]
  };
}

// 获取时辰地支
function getHourBranch(hour: number): string {
  // 处理23:00-1:00的特殊情况
  if (hour >= 23 || hour < 1) {
    return '子';
  }
  
  // 对其他时间，找到对应的地支
  for (const [endHour, branch] of HOUR_TO_BRANCH_MAP) {
    if (hour < endHour) {
      return branch;
    }
  }
  
  return '子'; // 默认返回子时
}

// 根据日干获取时干起始索引
function getHourStemStartIndex(dayStem: string): number {
  const dayIndex = HEAVENLY_STEMS.indexOf(dayStem);
  if (dayIndex === -1) {
    throw new Error('无效的日干');
  }
  return (dayIndex * 2) % 10;
}

// 根据时辰地支获取时干
function getHourStem(branchIndex: number, startIndex: number): string {
  const stemIndex = (startIndex + branchIndex) % 10;
  return HEAVENLY_STEMS[stemIndex];
}

// 计算时柱
function calculateHourPillar(date: Date, dayStem: string): BaziPillar {
  const hour = date.getHours();
  const branch = getHourBranch(hour);
  const branchIndex = EARTHLY_BRANCHES.indexOf(branch);
  
  if (branchIndex === -1) {
    throw new Error('无效的时辰地支');
  }
  
  const stemStartIndex = getHourStemStartIndex(dayStem);
  const stem = getHourStem(branchIndex, stemStartIndex);
  
  return { stem, branch };
}

// 计算完整八字
export async function calculateBazi(birthDate: Date): Promise<BaziResult> {
  try {
    // 获取农历日期和干支
    const lunarDate = await Calendar.solarToLunar(birthDate);
    const ganZhi = await Calendar.getGanZhi(birthDate);
    
    if (!ganZhi.year || !ganZhi.month || !ganZhi.day) {
      throw new Error('获取干支数据失败');
    }

    console.log('API returned GanZhi:', ganZhi); // 调试日志

    // 直接使用API返回的年月日干支
    const yearPillar = splitGanZhi(ganZhi.year);
    const monthPillar = splitGanZhi(ganZhi.month);
    const dayPillar = splitGanZhi(ganZhi.day);
    
    // 只计算时柱
    const hourPillar = calculateHourPillar(birthDate, dayPillar.stem);
    
    const result = {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
      lunarDate
    };

    console.log('Final BaZi result:', result); // 调试日志
    
    return result;
  } catch (error) {
    console.error('八字计算失败:', error);
    throw error instanceof Error ? error : new Error('八字计算失败');
  }
}