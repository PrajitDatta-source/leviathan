export interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  folder: "inbox" | "sent" | "drafts" | "spam";
  labels: string[];
}

export interface MailMessage extends Email {}

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

export const LABEL_MAPPING: Record<string, string> = {
  "Label_1": "Inbox",
  "Label_2": "Starred",
  "Label_3": "Sent",
  "Label_4": "Work",
  "Label_5": "Iris",
  "Label_6": "Security",
  "Label_7": "Personal",
  "Label_8": "Drafts",
  "Label_9": "Spam",
};

export function resolveLabels(labels: string[]): string[] {
  return labels.map(l => LABEL_MAPPING[l] || l);
}

const initialThreads: MailThread[] = [
  {
    id: "thread_1",
    subject: "Iris Project Milestones",
    isRead: false,
    isStarred: true,
    labels: ["Label_4", "Label_5"], // Work, Iris
    lastMessageTimestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    messages: [
      {
        id: "msg_1",
        threadId: "thread_1",
        from: "Prajit Datta <prajit@iris.sh>",
        to: "team@iris.sh",
        subject: "Iris Project Milestones",
        body: "Hi team,\n\nWe need to make sure the desktop z-index layering, window manager keyboard shortcuts, and resizing are 100% complete by tomorrow.\n\nLet me know your status.\n\nBest,\nPrajit",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        isRead: false,
        isStarred: true,
        folder: "inbox",
        labels: ["Label_4", "Label_5"],
      }
    ]
  },
  {
    id: "thread_2",
    subject: "Security Audit Compliance Report",
    isRead: true,
    isStarred: false,
    labels: ["Label_6"], // Security
    lastMessageTimestamp: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    messages: [
      {
        id: "msg_2",
        threadId: "thread_2",
        from: "Security Gate <compliance@secgate.io>",
        to: "prajit@iris.sh",
        subject: "Security Audit Compliance Report",
        body: "Dear Administrator,\n\nThe weekly automated vulnerability scan of the Iris Web OS sandbox has completed with 0 high-severity threats found.\n\nReview the detailed report attached.\n\nSincerely,\nSecGate Automation",
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        isRead: true,
        isStarred: false,
        folder: "inbox",
        labels: ["Label_6"],
      }
    ]
  },
  {
    id: "thread_3",
    subject: "Draft: Google Apps Script Integration Notes",
    isRead: true,
    isStarred: false,
    labels: ["Label_8"], // Drafts
    lastMessageTimestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    messages: [
      {
        id: "msg_3",
        threadId: "thread_3",
        from: "You <prajit@iris.sh>",
        to: "",
        subject: "Draft: Google Apps Script Integration Notes",
        body: "Ideas for connecting Google Apps Script:\n- Expose doPost web apps for webhook handlers\n- Store OAuth tokens securely in Iris encrypted cred storage\n- Map Gmail messages dynamically to threads using threadId...",
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        isRead: true,
        isStarred: false,
        folder: "drafts",
        labels: [],
      }
    ]
  },
  {
    id: "thread_4",
    subject: "Urgent: Direct Transfer Offer",
    isRead: false,
    isStarred: false,
    labels: ["Label_9"], // Spam
    lastMessageTimestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    messages: [
      {
        id: "msg_4",
        threadId: "thread_4",
        from: "Spam Bot <offer@spambot.io>",
        to: "prajit@iris.sh",
        subject: "Urgent: Direct Transfer Offer",
        body: "Congratulations! You have been selected to receive a direct transfer of $10,000,000. Click here to claim your reward immediately.",
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        isRead: false,
        isStarred: false,
        folder: "spam",
        labels: ["Label_9"],
      }
    ]
  },
  {
    id: "thread_5",
    subject: "Weekend BBQ plans",
    isRead: true,
    isStarred: true,
    labels: ["Label_7"], // Personal
    lastMessageTimestamp: new Date(Date.now() - 3600000 * 36).toISOString(),
    messages: [
      {
        id: "msg_5",
        threadId: "thread_5",
        from: "Sarah Jenkins <sarah@family.com>",
        to: "prajit@iris.sh",
        subject: "Weekend BBQ plans",
        body: "Hey! Are we still on for the BBQ this Saturday? Let me know what I should bring. I was thinking of making some potato salad.",
        timestamp: new Date(Date.now() - 3600000 * 36).toISOString(),
        isRead: true,
        isStarred: true,
        folder: "inbox",
        labels: ["Label_7"],
      }
    ]
  }
];

class MailServiceImpl {
  private threads: MailThread[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("iris_mail_threads");
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
      localStorage.setItem("iris_mail_threads", JSON.stringify(this.threads));
    }
  }

  private mapThread(t: MailThread): MailThread {
    return {
      ...t,
      labels: resolveLabels(t.labels),
      messages: t.messages.map(m => ({
        ...m,
        labels: resolveLabels(m.labels)
      }))
    };
  }

  async getEmails(filter: "inbox" | "sent" | "drafts" | "spam" | string): Promise<MailThread[]> {
    let filtered = this.threads;

    const isFolder = ["inbox", "sent", "drafts", "spam"].includes(filter.toLowerCase());
    
    if (isFolder) {
      filtered = this.threads.filter(t => 
        t.messages.some(m => m.folder === filter.toLowerCase())
      );
    } else {
      const targetLabel = filter.toLowerCase();
      filtered = this.threads.filter(t => 
        t.labels.some(l => l.toLowerCase() === targetLabel) ||
        resolveLabels(t.labels).some(l => l.toLowerCase() === targetLabel)
      );
    }

    return filtered
      .map(t => this.mapThread(t))
      .sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime());
  }

  async getThreads(folder: "inbox" | "sent" | "drafts" | "spam" = "inbox"): Promise<MailThread[]> {
    return this.getEmails(folder);
  }

  async getThreadById(id: string): Promise<MailThread | null> {
    const thread = this.threads.find(t => t.id === id);
    return thread ? this.mapThread(thread) : null;
  }

  async searchThreads(query: string): Promise<MailThread[]> {
    const q = query.toLowerCase();
    const matches = this.threads.filter(t => 
      t.subject.toLowerCase().includes(q) ||
      t.messages.some(m => 
        m.body.toLowerCase().includes(q) || 
        m.from.toLowerCase().includes(q) ||
        m.to.toLowerCase().includes(q)
      ) ||
      resolveLabels(t.labels).some(l => l.toLowerCase().includes(q))
    );

    return matches
      .map(t => this.mapThread(t))
      .sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime());
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
      from: "You <prajit@iris.sh>",
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

  async getUserLabels(): Promise<string[]> {
    const systemLabels = ["inbox", "sent", "drafts", "spam", "starred", "Label_1", "Label_2", "Label_3", "Label_8", "Label_9"];
    const labels = new Set<string>();
    this.threads.forEach(t => {
      resolveLabels(t.labels).forEach(l => {
        if (!systemLabels.includes(l.toLowerCase()) && !Object.keys(LABEL_MAPPING).includes(l)) {
          labels.add(l);
        }
      });
    });
    return Array.from(labels);
  }
}

export const MailService = new MailServiceImpl();
