/**
 * Gemini Nano Bridge Script
 * ページコンテキストに注入してLanguageModel APIにアクセスするためのブリッジ
 */

// メッセージの型定義
interface BridgeRequest {
  type: 'GEMINI_NANO_REQUEST'
  action: 'checkAvailability' | 'createSession' | 'prompt' | 'destroy'
  payload?: any
  requestId: string
}

interface BridgeResponse {
  type: 'GEMINI_NANO_RESPONSE'
  requestId: string
  success: boolean
  data?: any
  error?: string
}

const SYSTEM_PROMPT = `あなたは会議の内容を構造化するアシスタントです。
入力された会議のキャプション（字幕テキスト）から、重要なキーワードとトピックを抽出し、
階層的な箇条書きリストとして出力してください。

出力ルール：
1. JSON配列形式で出力してください
2. 各アイテムは { "text": "トピック", "children": [...] } の形式
3. 最大3階層までのネストにしてください
4. 具体的な詳細より、キーワードやトピック名を優先してください
5. 新しく言及されたトピックのみを抽出してください
6. 出力はJSON配列のみ、説明文は不要です

出力例：
[
  {
    "text": "プロジェクト進捗",
    "children": [
      { "text": "フロントエンド", "children": [{ "text": "React移行" }] },
      { "text": "バックエンド", "children": [] }
    ]
  }
]`;

// ページコンテキストで実行されるコード
(function() {
  let session: any = null;

  // APIの存在確認
  function getLanguageModelAPI(): any {
    if (typeof self !== 'undefined' && (self as any).LanguageModel) {
      return (self as any).LanguageModel;
    }
    if (typeof window !== 'undefined' && (window as any).LanguageModel) {
      return (window as any).LanguageModel;
    }
    if (typeof window !== 'undefined' && (window as any).ai?.languageModel) {
      return (window as any).ai.languageModel;
    }
    return null;
  }

  // 可用性チェック
  async function checkAvailability(): Promise<{ available: boolean; status: string }> {
    const api = getLanguageModelAPI();
    if (!api) {
      return { available: false, status: 'not-supported' };
    }

    try {
      let status: string;
      if (api.availability) {
        // 新しいAPI
        status = await api.availability();
      } else if (api.capabilities) {
        // 古いAPI
        const caps = await api.capabilities();
        status = caps.available;
      } else {
        return { available: false, status: 'not-supported' };
      }

      return {
        available: status === 'readily',
        status: status
      };
    } catch (error) {
      console.error('[GeminiBridge] Availability check failed:', error);
      return { available: false, status: 'error' };
    }
  }

  // セッション作成
  async function createSession(): Promise<boolean> {
    const api = getLanguageModelAPI();
    if (!api) return false;

    try {
      session = await api.create({
        systemPrompt: SYSTEM_PROMPT
      });
      console.log('[GeminiBridge] Session created');
      return true;
    } catch (error) {
      console.error('[GeminiBridge] Failed to create session:', error);
      return false;
    }
  }

  // プロンプト実行
  async function executePrompt(text: string): Promise<string> {
    if (!session) {
      const created = await createSession();
      if (!created) {
        throw new Error('Failed to create session');
      }
    }

    const prompt = `以下の会議キャプションから重要なトピックとキーワードを抽出してください：

${text}

JSON配列のみを出力してください：`;

    return await session.prompt(prompt);
  }

  // セッション破棄
  function destroySession(): void {
    if (session) {
      try {
        session.destroy();
      } catch (e) {
        // ignore
      }
      session = null;
    }
  }

  // メッセージハンドラ
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    
    const request = event.data as BridgeRequest;
    if (request.type !== 'GEMINI_NANO_REQUEST') return;

    let response: BridgeResponse = {
      type: 'GEMINI_NANO_RESPONSE',
      requestId: request.requestId,
      success: false
    };

    try {
      switch (request.action) {
        case 'checkAvailability': {
          const result = await checkAvailability();
          response.success = true;
          response.data = result;
          break;
        }
        case 'createSession': {
          const created = await createSession();
          response.success = created;
          break;
        }
        case 'prompt': {
          const result = await executePrompt(request.payload);
          response.success = true;
          response.data = result;
          break;
        }
        case 'destroy': {
          destroySession();
          response.success = true;
          break;
        }
      }
    } catch (error) {
      response.success = false;
      response.error = error instanceof Error ? error.message : 'Unknown error';
    }

    window.postMessage(response, '*');
  });

  console.log('[GeminiBridge] Initialized in page context');
})();

