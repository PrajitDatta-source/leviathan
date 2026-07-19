export interface TelegramChat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  messages: TelegramMessage[];
}

export interface TelegramMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  isBot: boolean;
  attachmentUrl?: string;
  attachmentType?: "image" | "file";
  attachmentName?: string;
}

const initialChats: TelegramChat[] = [
  {
    id: "tg_bot",
    name: "Telegram Bot",
    avatar: "TB",
    lastMessage: "Welcome to Leviathan OS Telegram integration! Secure connection established.",
    timestamp: new Date(Date.now() - 600000).toISOString(),
    unreadCount: 1,
    isOnline: true,
    messages: [
      {
        id: "msg_1",
        sender: "Telegram Bot",
        text: "Welcome to Leviathan OS Telegram integration! Secure connection established.",
        timestamp: new Date(Date.now() - 600000).toISOString(),
        isBot: true,
      }
    ]
  },
  {
    id: "prajit_sec",
    name: "Security Channel",
    avatar: "SC",
    lastMessage: "Audit completed successfully.",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    unreadCount: 0,
    isOnline: false,
    messages: [
      {
        id: "msg_2",
        sender: "Compliance Bot",
        text: "Audit completed successfully. All sandbox modules check clean.",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        isBot: true,
      }
    ]
  }
];

class TelegramServiceImpl {
  private chats: TelegramChat[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("leviathan_telegram_chats");
      if (stored) {
        this.chats = JSON.parse(stored);
      } else {
        this.chats = initialChats;
        this.save();
      }
    } else {
      this.chats = initialChats;
    }
  }

  private save() {
    if (typeof window !== "undefined") {
      localStorage.setItem("leviathan_telegram_chats", JSON.stringify(this.chats));
    }
  }

  async getChats(): Promise<TelegramChat[]> {
    return this.chats;
  }

  async getChatById(id: string): Promise<TelegramChat | null> {
    return this.chats.find(c => c.id === id) || null;
  }

  async sendMessage(chatId: string, text: string, attachment?: { name: string; url: string; type: "image" | "file" }): Promise<void> {
    this.chats = this.chats.map(chat => {
      if (chat.id === chatId) {
        const newMsg: TelegramMessage = {
          id: `msg_${Date.now()}`,
          sender: "You (Owner)",
          text,
          timestamp: new Date().toISOString(),
          isBot: false,
          attachmentName: attachment?.name,
          attachmentUrl: attachment?.url,
          attachmentType: attachment?.type
        };

        const msgs = [...chat.messages, newMsg];
        
        // Auto-reply mock trigger
        if (chatId === "tg_bot") {
          setTimeout(() => {
            this.receiveBotMessage(chatId, `Acknowledged: "${text}". Webhook connector is working successfully!`);
          }, 1000);
        }

        return {
          ...chat,
          lastMessage: text || (attachment ? `📎 ${attachment.name}` : ""),
          timestamp: newMsg.timestamp,
          messages: msgs
        };
      }
      return chat;
    });
    this.save();
  }

  private receiveBotMessage(chatId: string, text: string) {
    this.chats = this.chats.map(chat => {
      if (chat.id === chatId) {
        const newMsg: TelegramMessage = {
          id: `msg_${Date.now()}`,
          sender: "Telegram Bot",
          text,
          timestamp: new Date().toISOString(),
          isBot: true
        };
        return {
          ...chat,
          lastMessage: text,
          timestamp: newMsg.timestamp,
          unreadCount: chat.unreadCount + 1,
          messages: [...chat.messages, newMsg]
        };
      }
      return chat;
    });
    this.save();
    
    // Dispatch system events so active windows update automatically
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("telegram-message-received", { detail: { chatId } }));
    }
  }

  async clearUnread(chatId: string): Promise<void> {
    this.chats = this.chats.map(chat => 
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
    );
    this.save();
  }
}

export const TelegramService = new TelegramServiceImpl();
