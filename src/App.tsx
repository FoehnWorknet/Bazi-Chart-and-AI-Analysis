import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, User, MessageSquare, GitBranch, Key, Settings } from 'lucide-react';
import { calculateBazi, BaziResult } from './lib/bazi';
import { generateAnalysis } from './lib/analysis';
import { generateMindmap } from './lib/mindmap';
import { Mindmap } from './components/Mindmap';
import { setTianapiKey, getTianapiKey } from './lib/apiKeys';
import { setSiliconflowKey, getSiliconflowKey } from './lib/apiKeys';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
}

function App() {
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('male');
  const [result, setResult] = useState<BaziResult | null>(null);
  const [thinking, setThinking] = useState('');
  const [content, setContent] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('Pro/deepseek-ai/DeepSeek-R1');
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [mindmapContent, setMindmapContent] = useState('');
  const [isGeneratingMindmap, setIsGeneratingMindmap] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tianapiKey, setTianapiKeyState] = useState('');
  const [siliconflowKey, setSiliconflowKeyState] = useState('');
  const [isSettingsComplete, setIsSettingsComplete] = useState(false);
  
  // 初始化时加载API密钥
  useEffect(() => {
    const savedTianapiKey = getTianapiKey();
    const savedSiliconflowKey = getSiliconflowKey();
    
    if (savedTianapiKey) setTianapiKeyState(savedTianapiKey);
    if (savedSiliconflowKey) setSiliconflowKeyState(savedSiliconflowKey);
    
    // 如果两个API密钥都已设置，则标记设置完成
    setIsSettingsComplete(!!savedTianapiKey && !!savedSiliconflowKey);
    
    // 如果没有设置API密钥，则显示设置面板
    if (!savedTianapiKey || !savedSiliconflowKey) {
      setShowSettings(true);
    }
  }, []);
  
  const saveSettings = () => {
    if (tianapiKey) setTianapiKey(tianapiKey);
    if (siliconflowKey) setSiliconflowKey(siliconflowKey);
    
    setIsSettingsComplete(!!tianapiKey && !!siliconflowKey);
    setShowSettings(false);
  };
  
  const calculateBaziResult = async () => {
    if (!birthDate) return;
    
    setIsCalculating(true);
    setError(null);
    
    try {
      const date = new Date(birthDate);
      
      if (isNaN(date.getTime())) {
        throw new Error('无效的日期格式');
      }
      
      const year = date.getFullYear();
      if (year < 1900 || year > 2100) {
        throw new Error('日期必须在1900年到2100年之间');
      }

      const baziResult = await calculateBazi(date);
      if (!baziResult) {
        throw new Error('八字计算失败');
      }
      
      setResult(baziResult);
      setMessages([]); // 重置对话历史
      setThinking('');
      setContent('');
      setMindmapContent(''); // 重置思维导图内容
    } catch (error) {
      console.error('Error calculating BaZi:', error);
      setError(error instanceof Error ? error.message : '计算八字时出错，请检查输入日期是否正确');
      setResult(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const startAnalysis = async () => {
    if (!result) return;
    
    setIsAnalyzing(true);
    setError(null);
    setThinking('');
    setContent('');
    
    try {
      await generateAnalysis(
        result,
        gender,
        selectedModel,
        {
          onThinking: (newThinking) => {
            setThinking(newThinking);
          },
          onContent: (newContent) => {
            setContent(prev => prev + newContent);
          },
          onError: (error) => {
            setError(error.message);
            setIsAnalyzing(false);
          },
          onComplete: () => {
            setIsAnalyzing(false);
            setMessages(prev => [
              ...prev,
              { role: 'user', content: '请分析我的八字' },
              { role: 'assistant', content: content, thinking: thinking }
            ]);
          }
        },
        messages.map(({ role, content }) => ({ role, content }))
      );
    } catch (error) {
      console.error('Error during analysis:', error);
      setError(error instanceof Error ? error.message : 'AI分析过程中出错，请重试');
    }
  };

  const generateMindmapContent = async () => {
    if (!result) return;
    
    setIsGeneratingMindmap(true);
    setError(null);
    setMindmapContent('');
    
    try {
      await generateMindmap(
        result,
        gender,
        {
          onContent: (newContent) => {
            setMindmapContent(newContent);
          },
          onError: (error) => {
            setError(error.message);
            setIsGeneratingMindmap(false);
          },
          onComplete: () => {
            setIsGeneratingMindmap(false);
          }
        }
      );
    } catch (error) {
      console.error('Error generating mindmap:', error);
      setError(error instanceof Error ? error.message : '思维导图生成过程中出错，请重试');
    }
  };

  const handleContinueDialog = async () => {
    if (!userInput.trim() || !result) return;
    
    setIsAnalyzing(true);
    setError(null);
    setThinking('');
    setContent('');
    
    const newMessage = { role: 'user' as const, content: userInput };
    
    try {
      await generateAnalysis(
        result,
        gender,
        selectedModel,
        {
          onThinking: (newThinking) => {
            setThinking(newThinking);
          },
          onContent: (newContent) => {
            setContent(prev => prev + newContent);
          },
          onError: (error) => {
            setError(error.message);
            setIsAnalyzing(false);
          },
          onComplete: () => {
            setIsAnalyzing(false);
            setMessages(prev => [
              ...prev,
              newMessage,
              { role: 'assistant', content: content, thinking: thinking }
            ]);
            setUserInput(''); // 清空输入
          }
        },
        [...messages.map(({ role, content }) => ({ role, content })), newMessage]
      );
    } catch (error) {
      console.error('Error during analysis:', error);
      setError(error instanceof Error ? error.message : 'AI分析过程中出错，请重试');
    }
  };

  const formatLunarDate = (result: BaziResult) => {
    const { lunarDate } = result;
    return `${lunarDate.year}年${lunarDate.isLeap ? '闰' : ''}${lunarDate.month}月${lunarDate.day}日`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:py-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* 设置按钮 */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <Settings className="w-5 h-5" />
            <span>API设置</span>
          </button>
        </div>
        
        {/* API设置面板 */}
        {showSettings && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 sm:w-6 sm:h-6" />
              API密钥设置
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  天行API密钥（黄历API）
                </label>
                <input
                  type="text"
                  value={tianapiKey}
                  onChange={(e) => setTianapiKeyState(e.target.value)}
                  placeholder="请输入天行API密钥"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  用于获取农历日期和干支数据，可在<a href="https://www.tianapi.com/apiview/121" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">天行数据</a>申请
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  硅基流动API密钥（AI模型）
                </label>
                <input
                  type="text"
                  value={siliconflowKey}
                  onChange={(e) => setSiliconflowKeyState(e.target.value)}
                  placeholder="请输入硅基流动API密钥"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  用于AI分析和思维导图生成，可在<a href="https://siliconflow.cn" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">硅基流动</a>申请
                </p>
              </div>
              
              <button
                onClick={saveSettings}
                disabled={!tianapiKey || !siliconflowKey}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存设置
              </button>
            </div>
          </div>
        )}
        
        {/* 八字排盘面板 */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            八字排盘
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                出生日期时间（公历）
              </label>
              <input
                type="datetime-local"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                性别
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>

            <button
              onClick={calculateBaziResult}
              disabled={isCalculating || !birthDate || !isSettingsComplete}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCalculating ? '计算中...' : '排盘'}
            </button>
            
            {!isSettingsComplete && (
              <div className="text-amber-600 text-sm mt-2">
                请先设置API密钥才能使用排盘功能
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm mt-2">
                {error}
              </div>
            )}
          </div>

          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">农历日期</h3>
              <p className="text-gray-700 mb-4">{formatLunarDate(result)}</p>
              
              <h3 className="text-lg font-semibold mb-4">八字结果</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-2 bg-gray-50 text-sm">柱</th>
                      <th className="border p-2 bg-gray-50 text-sm">年柱</th>
                      <th className="border p-2 bg-gray-50 text-sm">月柱</th>
                      <th className="border p-2 bg-gray-50 text-sm">日柱</th>
                      <th className="border p-2 bg-gray-50 text-sm">时柱</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2 text-sm">天干</td>
                      <td className="border p-2 text-sm">{result.year.stem}</td>
                      <td className="border p-2 text-sm">{result.month.stem}</td>
                      <td className="border p-2 text-sm">{result.day.stem}</td>
                      <td className="border p-2 text-sm">{result.hour.stem}</td>
                    </tr>
                    <tr>
                      <td className="border p-2 text-sm">地支</td>
                      <td className="border p-2 text-sm">{result.year.branch}</td>
                      <td className="border p-2 text-sm">{result.month.branch}</td>
                      <td className="border p-2 text-sm">{result.day.branch}</td>
                      <td className="border p-2 text-sm">{result.hour.branch}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 思维导图面板 */}
        {result && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
              <GitBranch className="w-5 h-5 sm:w-6 sm:h-6" />
              八字思维导图
            </h2>

            <button
              onClick={generateMindmapContent}
              disabled={isGeneratingMindmap || !isSettingsComplete}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {isGeneratingMindmap ? '生成中...' : '生成思维导图'}
            </button>

            {mindmapContent && (
              <div className="mt-4">
                <Mindmap 
                  content={mindmapContent} 
                  className="h-[500px] border border-gray-200 rounded-lg"
                />
              </div>
            )}
          </div>
        )}

        {/* AI命理分析面板 */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 sm:w-6 sm:h-6" />
            大师有话说
          </h2>

          {/* 对话历史 */}
          <div className="space-y-6 mb-6">
            {messages.map((message, index) => (
              <div key={index} className="space-y-4">
                {message.role === 'user' ? (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-blue-800">{message.content}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {message.thinking && (
                      <div className="bg-black p-6 rounded-lg shadow-inner">
                        <h3 className="text-sm font-medium text-white mb-3">思考过程</h3>
                        <p className="text-white whitespace-pre-wrap leading-relaxed font-mono text-sm">
                          {message.thinking}
                        </p>
                      </div>
                    )}
                    {message.content && (
                      <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">分析结果</h3>
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 当前分析内容 */}
          {(thinking || content || isAnalyzing) && (
            <div className="space-y-6 mb-6">
              {thinking && (
                <div className="bg-black p-6 rounded-lg shadow-inner">
                  <h3 className="text-sm font-medium text-white mb-3">思考过程</h3>
                  <p className="text-white whitespace-pre-wrap leading-relaxed font-mono text-sm">
                    {thinking}
                  </p>
                </div>
              )}
              {content && (
                <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">分析结果</h3>
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {content}
                  </p>
                </div>
              )}
              {isAnalyzing && !thinking && !content && (
                <div className="bg-white border border-gray-200 p-6 rounded-lg text-center">
                  <p className="text-gray-600">正在分析中...</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={startAnalysis}
              disabled={isAnalyzing || !result || !isSettingsComplete}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? '分析中...' : '开始分析'}
            </button>
            
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="Pro/deepseek-ai/DeepSeek-R1">Pro/deepseek-ai/DeepSeek-R1</option>
            </select>
          </div>

          {/* 对话继续区域 */}
          {messages.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                继续对话
              </h3>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="输入你的问题..."
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleContinueDialog();
                    }
                  }}
                />
                <button
                  onClick={handleContinueDialog}
                  disabled={isAnalyzing || !userInput.trim() || !isSettingsComplete}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  发送
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;