import { BaziResult } from './bazi';
import { getSiliconflowKey } from './apiKeys';

const SILICONFLOW_API = 'https://api.siliconflow.cn/v1/chat/completions';

export interface MindmapCallback {
  onContent: (content: string) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
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

export async function generateMindmap(
  bazi: BaziResult,
  gender: string,
  callbacks: MindmapCallback
): Promise<void> {
  const content = generatePrompt(bazi, gender);
  
  // 获取用户设置的API密钥
  const SILICONFLOW_KEY = getSiliconflowKey();
  
  try {
    const response = await fetch(SILICONFLOW_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SILICONFLOW_KEY}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        model: 'Pro/deepseek-ai/DeepSeek-V3',
        messages: [
          {
            role: 'system',
            content: `你是一个专业的八字命理分析专家。请使用Markdown格式生成一个清晰的思维导图。

要求：
1. 使用Markdown标准语法
2. 只使用#、##、###等标题和-列表符号
3. 确保每个节点简洁明了
4. 不要使用其他格式化语法
5. 不要添加任何额外的说明文字
6. 严格按照思维导图的层级结构组织内容

示例格式：
# 主题
## 一级节点1
- 内容1
- 内容2
## 一级节点2
- 内容1
  - 子内容1
  - 子内容2
- 内容2`
          },
          {
            role: 'user',
            content
          }
        ],
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error('思维导图生成请求失败');
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const decoder = new TextDecoder();
    let markdown = '';

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
              markdown += content;
              callbacks.onContent(markdown);
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', e);
          }
        }
      }
    }
    
    callbacks.onComplete();
  } catch (error) {
    console.error('思维导图生成失败:', error);
    callbacks.onError(error instanceof Error ? error : new Error('思维导图生成失败'));
  }
}

function generatePrompt(bazi: BaziResult, gender: string): string {
  return `请分析以下八字并生成思维导图：

生辰八字：
年柱：${bazi.year.stem}${bazi.year.branch}
月柱：${bazi.month.stem}${bazi.month.branch}
日柱：${bazi.day.stem}${bazi.day.branch}
时柱：${bazi.hour.stem}${bazi.hour.branch}

性别：${gender === 'male' ? '男' : '女'}性

请生成一个详细的思维导图，包括以下方面：

1. 基础信息（生辰八字、性别、命局特点）
2. 五行分析（日主特征、五行生克、喜用神、忌神）
3. 性格特征（性格优点、性格缺点、行为模式）
4. 事业发展（适合行业、发展方向、机遇时机）
5. 财运分析（财运特点、理财建议、破财因素）
6. 健康提示（易患疾病、养生建议、注意事项）
7. 人际关系（家庭关系、婚姻状况、社交特点）
8. 大运流年（近期运势、重要时期、发展建议）

注意：
1. 使用简洁的语言
2. 每个要点不超过20字
3. 保持层级结构清晰
4. 使用标准的Markdown语法`;
}