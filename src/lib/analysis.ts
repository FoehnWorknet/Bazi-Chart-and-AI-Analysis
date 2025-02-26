import { BaziResult } from './bazi';
import { getSiliconflowKey } from './apiKeys';

const SILICONFLOW_API = 'https://api.siliconflow.cn/v1/chat/completions';

export interface AnalysisCallback {
  onThinking: (thinking: string) => void;
  onContent: (content: string) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function processStreamChunk(chunk: string, currentBuffer: string): {
  buffer: string;
  thinking: string;
  content: string;
} {
  const fullText = currentBuffer + chunk;
  
  // 检查是否有完整的思考标签对
  const thinkMatch = fullText.match(/<think>([\s\S]*?)<\/think>/);
  
  if (thinkMatch) {
    // 提取思考内容和剩余内容
    const thinking = thinkMatch[1].trim();
    const remainingText = fullText.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    
    return {
      buffer: '',
      thinking: thinking,
      content: remainingText
    };
  }
  
  // 如果有未闭合的思考标签，继续缓冲
  if (fullText.includes('<think>')) {
    return {
      buffer: fullText,
      thinking: '',
      content: ''
    };
  }
  
  // 如果没有思考标签，作为普通内容处理
  return {
    buffer: '',
    thinking: '',
    content: fullText.trim()
  };
}

async function* streamAsyncIterator(stream: ReadableStream) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function generateAnalysis(
  bazi: BaziResult, 
  gender: string, 
  model: string = 'Pro/deepseek-ai/DeepSeek-R1',
  callbacks: AnalysisCallback,
  messages: Message[] = []
): Promise<void> {
  let prompt: string;
  
  if (messages.length === 0) {
    prompt = generateInitialPrompt(bazi, gender);
  } else {
    prompt = generateContinuePrompt(bazi, gender, messages[messages.length - 1].content);
  }

  let buffer = '';
  let currentThinking = '';

  // 获取用户设置的API密钥
  const SILICONFLOW_KEY = getSiliconflowKey();

  const systemMessage = {
    role: 'system',
    content: `你是一个熟读穷通宝典、三命通会、滴天髓、渊海子平、千里命稿、协纪辨方书、果老星宗、子平真栓、神峰通考等一系列书籍。专业的中国传统八字命理研究人员。在回答任何问题之前，你必须先用<think>标签详细说明你的分析思路和推理过程。然后再给出最终的分析结果。

示例格式：
<think>
1. 分析思路...
2. 推理过程...
3. 结论推导...
</think>

最终分析结果和建议...`
  };

  const allMessages = [
    systemMessage,
    ...messages,
    { role: 'user', content: prompt }
  ];
  
  try {
    const response = await fetch(SILICONFLOW_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SILICONFLOW_KEY}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        model: model,
        messages: allMessages,
        temperature: 0.7,
        stream: true,
        max_tokens: null
      })
    });

    if (!response.ok) {
      throw new Error('AI分析请求失败');
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const decoder = new TextDecoder();

    for await (const chunk of streamAsyncIterator(response.body)) {
      const text = decoder.decode(chunk);
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line === 'data: [DONE]') continue;
        
        if (line.startsWith('data: ')) {
          try {
            const data = line.slice(6);
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            
            if (content) {
              const { buffer: newBuffer, thinking, content: newContent } = 
                processStreamChunk(content, buffer);
              
              buffer = newBuffer;
              
              if (thinking && thinking !== currentThinking) {
                currentThinking = thinking;
                callbacks.onThinking(thinking);
              }
              
              if (newContent) {
                callbacks.onContent(newContent);
              }
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e);
          }
        }
      }
    }
    
    callbacks.onComplete();
  } catch (error) {
    console.error('AI分析失败:', error);
    callbacks.onError(error instanceof Error ? error : new Error('AI分析失败'));
  }
}

// 计算大运
function calculateDaYun(bazi: BaziResult, gender: string): string[] {
  const monthStem = bazi.month.stem;
  const monthBranch = bazi.month.branch;
  
  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  
  const stemIndex = STEMS.indexOf(monthStem);
  const branchIndex = BRANCHES.indexOf(monthBranch);
  
  const daYun: string[] = [];
  const direction = gender === 'male' ? 1 : -1;
  
  for (let i = 0; i < 10; i++) {
    const newStemIndex = (stemIndex + direction * i + 10) % 10;
    const newBranchIndex = (branchIndex + direction * i + 12) % 12;
    daYun.push(`${STEMS[newStemIndex]}${BRANCHES[newBranchIndex]}`);
  }
  
  return daYun;
}

// 生成初始分析的提示词
function generateInitialPrompt(bazi: BaziResult, gender: string): string {
  const daYun = calculateDaYun(bazi, gender);
  const startYear = new Date().getFullYear();
  
  return `请分析以下八字：

生辰八字：
年柱：${bazi.year.stem}${bazi.year.branch}
月柱：${bazi.month.stem}${bazi.month.branch}
日柱：${bazi.day.stem}${bazi.day.branch}
时柱：${bazi.hour.stem}${bazi.hour.branch}

性别：${gender === 'male' ? '男' : '女'}性

大运从${startYear}年开始起运。
大运为：${daYun.join('、')}

请先用<think>标签详细说明你的分析思路和推理过程，包括：
1. 日元分析
2. 五行生克关系
3. 格局判断
4. 用神喜忌分析

然后再给出完整的八字分析，包括：
1. 性格特征
2. 家庭关系
3. 学业发展
4. 事业方向
5. 婚姻状况
6. 财运分析
7. 健康提醒
8. 大运流年分析`;
}

// 生成继续对话的提示词
function generateContinuePrompt(bazi: BaziResult, gender: string, question: string): string {
  return `基于以下八字：
年柱：${bazi.year.stem}${bazi.year.branch}
月柱：${bazi.month.stem}${bazi.month.branch}
日柱：${bazi.day.stem}${bazi.day.branch}
时柱：${bazi.hour.stem}${bazi.hour.branch}

性别：${gender === 'male' ? '男' : '女'}性

请先用<think>标签详细说明你的分析思路和推理过程，然后再回答用户的问题：${question}`;
}