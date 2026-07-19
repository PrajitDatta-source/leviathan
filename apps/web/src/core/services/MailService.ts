export interface MailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  folder: "inbox" | "sent" | "drafts";
  labels: string[];
}

export interface MailThread {
  id: string;
  subject: string;
  messages: MailMessage[];
  lastMessageTimestamp: string;
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
}

export interface ComposeMailInput {
  to: string;
  subject: string;
  body: string;
}

const initialThreads: MailThread[] = [
  {
    id: "thread_1",
    subject: "Leviathan Project Milestones",
    isRead: false,
    isStarred: true,
    labels: ["Work", "Leviathan"],
    lastMessageTimestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    messages: [
      {
        id: "msg_1",
        threadId: "thread_1",
        from: "Prajit Datta <prajit@leviathan.sh>",
        to: "team@leviathan.sh",
        subject: "Leviathan Project Milestones",
        body: "Hi team,\n\nWe need to make sure the desktop z-index layering, window manager keyboard shortcuts, and resizing are 100% complete by tomorrow.\n\nLet me know your status.\n\nBest,\nPrajit",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        isRead: false,
        isStarred: true,
        folder: "inbox",
        labels: ["Work", "Leviathan"],
      }
    ]
  },
  {
    id: "thread_2",
    subject: "Security Audit Compliance Report",
    isRead: true,
    isStarred: false,
    labels: ["Security"],
    lastMessageTimestamp: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    messages: [
      {
        id: "msg_2",
        threadId: "thread_2",
        from: "Security Gate <compliance@secgate.io>",
        to: "prajit@leviathan.sh",
        subject: "Security Audit Compliance Report",
        body: "Dear Administrator,\n\nThe weekly automated vulnerability scan of the Leviathan Web OS sandbox has completed with 0 high-severity threats found.\n\nReview the detailed report attached.\n\nSincerely,\nSecGate Automation",
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        isRead: true,
        isStarred: false,
        folder: "inbox",
        labels: ["Security"],
      }
    ]
  },
  {
    id: "thread_3",
    subject: "Draft: Google Apps Script Integration Notes",
    isRead: true,
    isStarred: false,
    labels: ["Drafts"],
    lastMessageTimestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    messages: [
      {
        id: "msg_3",
        threadId: "thread_3",
        from: "You <prajit@leviathan.sh>",
        to: "",
        subject: "Draft: Google Apps Script Integration Notes",
        body: "Ideas for connecting Google Apps Script:\n- Expose doPost web apps for webhook handlers\n- Store OAuth tokens securely in Leviathan encrypted cred storage\n- Map Gmail messages dynamically to threads using threadId...",
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        isRead: true,
        isStarred: false,
        folder: "drafts",
        labels: [],
      }
    ]
  }
];

class MailServiceImpl {
  private threads: MailThread[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("leviathan_mail_threads");
      if (stored) {
        this.threads = JSON.parse(stored);
      } else {
        this.threads = initialThreads;
        this.save();
      }
    } else {
      this.threads = initialThreads;
    }
  }

  private save() {
    if (typeof window !== "undefined") {
      localStorage.setItem("leviathan_mail_threads", JSON.stringify(this.threads));
    }
  }

  async getThreads(folder: "inbox" | "sent" | "drafts" = "inbox"): Promise<MailThread[]> {
    return this.threads.filter(t => 
      t.messages.some(m => m.folder === folder)
    );
  }

  async getThreadById(id: string): Promise<MailThread | null> {
    return this.threads.find(t => t.id === id) || null;
  }

  async searchThreads(query: string): Promise<MailThread[]> {
    const q = query.toLowerCase();
    return this.threads.filter(t => 
      t.subject.toLowerCase().includes(q) ||
      t.messages.some(m => 
        m.body.toLowerCase().includes(q) || 
        m.from.toLowerCase().includes(q) ||
        m.to.toLowerCase().includes(q)
      )
    );
  }

  async markAsRead(threadId: string, isRead: boolean): Promise<void> {
    this.threads = this.threads.map(t => {
      if (t.id === threadId) {
        return {
          ...t,
          isRead,
          messages: t.messages.map(m => ({ ...m, isRead }))
        };
      }
      return t;
    });
    this.save();
  }

  async toggleStar(threadId: string): Promise<void> {
    this.threads = this.threads.map(t => {
      if (t.id === threadId) {
        const nextStarred = !t.isStarred;
        return {
          ...t,
          isStarred: nextStarred,
          messages: t.messages.map(m => ({ ...m, isStarred: nextStarred }))
        };
      }
      return t;
    });
    this.save();
  }

  async compose(to: string, subject: string, body: string): Promise<void> {
    const newMsgId = `msg_${Date.now()}`;
    const newThreadId = `thread_${Date.now()}`;
    
    const newMsg: MailMessage = {
      id: newMsgId,
      threadId: newThreadId,
      from: "You <prajit@leviathan.sh>",
      to,
      subject,
      body,
      timestamp: new Date().toISOString(),
      isRead: true,
      isStarred: false,
      folder: "sent",
      labels: []
    };

    const newThread: MailThread = {
      id: newThreadId,
      subject,
      isRead: true,
      isStarred: false,
      labels: [],
      lastMessageTimestamp: newMsg.timestamp,
      messages: [newMsg]
    };

    this.threads = [newThread, ...this.threads];
    this.save();
  }

  async deleteThread(id: string): Promise<void> {
    this.threads = this.threads.filter(t => t.id !== id);
    this.save();
  }
}

export const MailService = new MailServiceImpl();
