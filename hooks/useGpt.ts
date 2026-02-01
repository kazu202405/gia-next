"use client";

import { useState } from "react";
import axios from "axios";

export function useGpt() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processWithGpt = async (inputText: string, prompt: string): Promise<string> => {
    setIsProcessing(true);

    try {
      if (!inputText || typeof inputText !== "string") {
        throw new Error("入力テキストが無効です。文字列を入力してください。");
      }
      if (!prompt || typeof prompt !== "string") {
        throw new Error("プロンプトが無効です。文字列を入力してください。");
      }

      const response = await axios.post("/api/openai", {
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: prompt.replace("${inputText}", inputText),
          },
        ],
        max_tokens: 3500,
      });

      const result = response.data.choices[0].message.content.trim();
      console.log("GPTによるJSON化の内容", result);
      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("GPTエラー内容:", error.response?.data || error.message);

        if (error.response?.status === 401) {
          alert("認証エラー: APIキーが正しく設定されていないか、有効期限が切れている可能性があります。");
        } else if (error.response?.status === 429) {
          alert("リクエスト制限エラー: APIのリクエスト上限を超えています。しばらく待って再試行してください。");
        } else if (error.response?.status && error.response.status >= 500) {
          alert("サーバーエラー: OpenAIサーバーに問題が発生しています。しばらく待って再試行してください。");
        } else {
          alert("不明なエラーが発生しました。詳細を確認して、再試行してください。");
        }
      }
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    processWithGpt,
  };
}
