export interface TelegramChat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  messages: TelegramMessage[];
  type: "dm" | "group" | "channel" | "saved";
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
  isDeleted?: boolean;
  isEdited?: boolean;
  isUnsent?: boolean;
  originalText?: string;
}

export interface MTProtoUpdateDeleteMessages {
  type: "UpdateDeleteMessages";
  chatId: string;
  messageIds: string[];
  isUnsent?: boolean; // Can be flagged as unsent/recalled
}

export interface MTProtoMessageEdit {
  type: "MessageEdit";
  chatId: string;
  messageId: string;
  newText: string;
}

export type MTProtoEvent = MTProtoUpdateDeleteMessages | MTProtoMessageEdit;

const initialChats: TelegramChat[] = [
  {
    id: "tg_bot",
    name: "Telegram Bot",
    avatar: "TB",
    lastMessage: "Welcome to Leviathan OS Telegram integration! Secure connection established.",
    timestamp: new Date(Date.now() - 600000).toISOString(),
    unreadCount: 1,
    isOnline: true,
    type: "dm",
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
    type: "channel",
    messages: [
      {
        id: "msg_2",
        sender: "Compliance Bot",
        text: "Audit completed successfully. All sandbox modules check clean.",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        isBot: true,
      }
    ]
  },
  {
    id: "saved_msgs",
    name: "Saved Messages",
    avatar: "SM",
    lastMessage: "Secure backup notes folder",
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    unreadCount: 0,
    isOnline: false,
    type: "saved",
    messages: [
      {
        id: "msg_3",
        sender: "You",
        text: "Important keys: save to SSH folder\n- test config setup\n- next steps for db sync",
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        isBot: false,
      }
    ]
  },
  {
    id: "dev_group",
    name: "Leviathan Core Devs",
    avatar: "LD",
    lastMessage: "Let's test the MTProto connection",
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    unreadCount: 2,
    isOnline: true,
    type: "group",
    messages: [
      {
        id: "msg_4",
        sender: "Alex Rivera",
        text: "Hey folks, just pushed the websocket connector",
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        isBot: false,
      },
      {
        id: "msg_5",
        sender: "Sofia Chen",
        text: "Excellent! Let's test the MTProto connection",
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        isBot: false,
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

  private notifyUpdate(chatId: string) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("telegram-message-received", { detail: { chatId } }));
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
    this.notifyUpdate(chatId);
  }

  async clearUnread(chatId: string): Promise<void> {
    this.chats = this.chats.map(chat => 
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
    );
    this.save();
  }

  // Intercept MTProto updates and flag instead of deleting
  async handleMTProtoEvent(event: MTProtoEvent): Promise<void> {
    this.chats = this.chats.map(chat => {
      if (chat.id === event.chatId) {
        let updatedMessages = chat.messages;
        if (event.type === "UpdateDeleteMessages") {
          updatedMessages = chat.messages.map(msg => {
            if (event.messageIds.includes(msg.id)) {
              if (event.isUnsent) {
                return { ...msg, isUnsent: true };
              } else {
                return { ...msg, isDeleted: true };
              }
            }
            return msg;
          });
        } else if (event.type === "MessageEdit") {
          updatedMessages = chat.messages.map(msg => {
            if (msg.id === event.messageId) {
              return { 
                ...msg, 
                isEdited: true, 
                originalText: msg.originalText || msg.text,
                text: event.newText 
              };
            }
            return msg;
          });
        }

        // Determine correct lastMessage content mapping
        const visibleMsgs = updatedMessages.filter(m => !m.isDeleted && !m.isUnsent);
        const lastMsgObj = visibleMsgs[visibleMsgs.length - 1] || updatedMessages[updatedMessages.length - 1];
        
        return {
          ...chat,
          messages: updatedMessages,
          lastMessage: lastMsgObj ? lastMsgObj.text : "No messages"
        };
      }
      return chat;
    });
    this.save();
    this.notifyUpdate(event.chatId);
  }
}

export const TelegramService = new TelegramServiceImpl();
