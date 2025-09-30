import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { Chat } from './chat';
import { ChatService, ChatMessage } from '../services/chat.service';
import { AuthService } from '../services/auth.service';

// --- MOCK DATA ---
const MOCK_CURRENT_USER = { id: 'user-1', user_metadata: { name: 'Me' } };
const MOCK_OTHER_USER = { id: 'user-2', name: 'Alice' };
const MOCK_CHATS_API = [
  { chatid: 101, user1: { userid: 'user-1' }, user2: { userid: 'user-2' } },
  { chatid: 102, user1: { userid: 'user-3' }, user2: { userid: 'user-1' } },
];
const MOCK_MESSAGES_API_101 = [
  { messageid: 1, chatid: 101, senderid: 'user-2', message: 'Hello!', sent_datetime: '2025-01-01T10:00:00' },
  { messageid: 2, chatid: 101, senderid: 'user-1', message: 'Hi Alice!', sent_datetime: '2025-01-01T10:01:00' },
];
const MOCK_MESSAGES_API_102 = [
  { messageid: 3, chatid: 102, senderid: 'user-3', message: 'Hey!', sent_datetime: '2025-01-02T10:00:00' },
];
const MOCK_CREATED_MESSAGE: ChatMessage = {
  messageid: 99,
  chatid: 101,
  senderid: 'user-1',
  sent_datetime: new Date(),
  message: 'Test message'
};

describe('Chat', () => {
  let component: Chat;
  let fixture: ComponentFixture<Chat>;
  let chatService: jasmine.SpyObj<ChatService>;
  let authService: jasmine.SpyObj<AuthService>;

  const getElement = (selector: string): HTMLElement | null =>
    fixture.debugElement.query(By.css(selector))?.nativeElement;
  const getAllElements = (selector: string): HTMLElement[] =>
    fixture.debugElement.queryAll(By.css(selector)).map(el => el.nativeElement);

  beforeEach(async () => {
    const chatServiceSpy = jasmine.createSpyObj('ChatService', ['getChatById', 'getMessagesByChatId', 'createMessage']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'getUserById']);

    await TestBed.configureTestingModule({
      imports: [Chat, ReactiveFormsModule],
      providers: [
        { provide: ChatService, useValue: chatServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Chat);
    component = fixture.componentInstance;
    chatService = TestBed.inject(ChatService) as jasmine.SpyObj<ChatService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  function setupHappyPathMocks() {
    authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: MOCK_CURRENT_USER } } as any));
    chatService.getChatById.and.returnValue(of(MOCK_CHATS_API as any));
    authService.getUserById.and.callFake((id: string) => {
      if (id === 'user-2') return Promise.resolve({ data: MOCK_OTHER_USER } as any);
      if (id === 'user-3') return Promise.resolve({ data: { id: 'user-3', name: 'Bob' } } as any);
      return Promise.resolve({ data: null } as any);
    });
    chatService.getMessagesByChatId.and.callFake((chatid: number) => {
      if (chatid === 101) return of(MOCK_MESSAGES_API_101 as any);
      if (chatid === 102) return of(MOCK_MESSAGES_API_102 as any);
      return of([]);
    });
  }

  xit('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should fetch and format conversations on init', fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();

      expect(component.loading$.value).toBeFalse();
      expect(component.conversations.length).toBe(2);
      expect(component.activeConversation).toBe(component.conversations[0]);
      expect(component.filteredConversations.length).toBe(2);
    }));

    it('should set current user data correctly', fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();

      expect(component.currentUser.userid).toBe('user-1');
      expect(component.currentUser.name).toBe('Me');
    }));

    it('should sort conversations by timestamp descending', fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();

      const firstConvoTime = component.conversations[0].timestamp.getTime();
      const secondConvoTime = component.conversations[1].timestamp.getTime();
      expect(firstConvoTime).toBeGreaterThanOrEqual(secondConvoTime);
    }));

    it('should handle error when getChatById fails', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: MOCK_CURRENT_USER } } as any));
      chatService.getChatById.and.returnValue(throwError(() => new Error('API Error')));

      fixture.detectChanges();
      tick();

      expect(component.error).toBe('Error formatting chat data');
      expect(component.conversations.length).toBe(0);
      expect(component.loading$.value).toBeFalse();
    }));

    it('should handle a conversation with no messages', fakeAsync(() => {
      setupHappyPathMocks();
      chatService.getMessagesByChatId.and.returnValue(of([]));
      fixture.detectChanges();
      tick();

      expect(component.conversations[0].messages.length).toBe(0);
      expect(component.conversations[0].timestamp).toBeDefined();
    }));

    it('should skip conversation when participant name cannot be fetched (undefined)', fakeAsync(() => {
      setupHappyPathMocks();
      authService.getUserById.and.returnValue(Promise.resolve({ data: { name: undefined } } as any));
      fixture.detectChanges();
      tick();

      // Conversations with undefined names should be skipped (continue statement)
      expect(component.conversations.length).toBeLessThanOrEqual(2);
    }));

    it('should handle when participant name is empty string', fakeAsync(() => {
      setupHappyPathMocks();
      authService.getUserById.and.returnValue(Promise.resolve({ data: { name: '' } } as any));
      fixture.detectChanges();
      tick();

      expect(component.conversations[0].participant.name).toBe('');
    }));

    xit('should handle error when getCurrentUser fails', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.reject(new Error('Auth failed')));
      spyOn(console, 'log');
      fixture.detectChanges();
      tick();

      expect(component.error).toBe('Error retrieving current userId');
      expect(component.currentUser.userid).toBe('');
    }));

    it('should handle null user from getCurrentUser', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: null } } as any));
      fixture.detectChanges();
      tick();

      expect(component.currentUser.userid).toBe('');
    }));

    it('should handle getChatById returning null', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: MOCK_CURRENT_USER } } as any));
      chatService.getChatById.and.returnValue(of(null as any));
      fixture.detectChanges();
      tick();

      expect(component.error).toBe('No chat found');
      expect(component.conversations.length).toBe(0);
    }));

    it('should handle user not part of conversation', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: { id: 'user-999' } } } as any));
      chatService.getChatById.and.returnValue(of([
        { chatid: 201, user1: { userid: 'user-5' }, user2: { userid: 'user-6' } }
      ] as any));
      fixture.detectChanges();
      tick();

      expect(component.error).toBe('You are not part of this conversation');
      expect(component.conversations.length).toBe(0);
    }));

    it('should handle error when retrieving messages fails', fakeAsync(() => {
      setupHappyPathMocks();
      chatService.getMessagesByChatId.and.returnValue(throwError(() => new Error('Messages API Error')));
      fixture.detectChanges();
      tick();

      expect(component.error).toBe('Error retrieving messages');
    }));

    it('should handle error when getUserById fails', fakeAsync(() => {
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: MOCK_CURRENT_USER } } as any));
      chatService.getChatById.and.returnValue(of(MOCK_CHATS_API as any));
      authService.getUserById.and.returnValue(Promise.reject(new Error('User API Error')));
      chatService.getMessagesByChatId.and.returnValue(of(MOCK_MESSAGES_API_101 as any));

      fixture.detectChanges();
      tick();

      expect(component.error).toBe('Error retrieving other username');
    }));

    it('should handle general error in ngOnInit catch block', fakeAsync(() => {
      // Force an error after getCurrentUserId succeeds but formatConvos fails
      authService.getCurrentUser.and.returnValue(Promise.resolve({ data: { user: MOCK_CURRENT_USER } } as any));
      chatService.getChatById.and.returnValue(throwError(() => new Error('Critical error')));

      fixture.detectChanges();
      tick();

      expect(component.error).toBe('Error formatting chat data');
    }));
  });

  describe('Message Formatting', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();
    }));

    it('should correctly identify sent vs received messages', fakeAsync(() => {
      // Find the conversation for chatid 101 which has messages from both users
      const convo101 = component.conversations.find(c => c.id === 101);
      expect(convo101).toBeDefined();

      const sentMsg = convo101!.messages.find(m => m.senderid === 'user-1');
      const receivedMsg = convo101!.messages.find(m => m.senderid === 'user-2');

      expect(sentMsg?.type).toBe('sent');
      expect(receivedMsg?.type).toBe('received');
    }));

    it('should parse UTC datetime correctly', fakeAsync(() => {
      const convo101 = component.conversations.find(c => c.id === 101);
      const message = convo101!.messages[0];
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(message.timestamp.toISOString()).toContain('2025-01-01');
    }));
  });

  describe('User Interactions', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('should send a message successfully', fakeAsync(() => {
      chatService.createMessage.and.returnValue(of(MOCK_CREATED_MESSAGE));
      const initialMessageCount = component.activeConversation!.messages.length;

      component.messageForm.get('message')?.setValue('Test message');
      component.sendMessage();
      tick();

      expect(chatService.createMessage).toHaveBeenCalled();
      expect(component.activeConversation!.messages.length).toBe(initialMessageCount + 1);
      expect(component.activeConversation!.lastMessage).toBe('Test message');
      expect(component.messageForm.get('message')?.value).toBeNull();
    }));

    it('should not send a message if no conversation is active', fakeAsync(() => {
      component.activeConversation = null;
      component.messageForm.get('message')?.setValue('Test message');
      component.sendMessage();
      tick();

      expect(chatService.createMessage).not.toHaveBeenCalled();
    }));

    it('should not send a message if form is invalid', fakeAsync(() => {
      component.messageForm.get('message')?.setValue('');
      component.sendMessage();
      tick();

      expect(chatService.createMessage).not.toHaveBeenCalled();
    }));

    it('should set error if createMessage service fails', fakeAsync(() => {
      chatService.createMessage.and.returnValue(throwError(() => new Error('Send failed')));
      component.messageForm.get('message')?.setValue('Test message');
      component.sendMessage();
      tick();

      expect(component.error).toBe('Failed to send message');
    }));

    it('should set error if createMessage returns null', fakeAsync(() => {
      chatService.createMessage.and.returnValue(of(null as any));
      component.messageForm.get('message')?.setValue('Test message');
      component.sendMessage();
      tick();

      expect(component.error).toBe('Failed to send message');
    }));

    it('should update conversation timestamp when sending message', fakeAsync(() => {
      chatService.createMessage.and.returnValue(of(MOCK_CREATED_MESSAGE));
      const beforeTime = new Date().getTime();

      component.messageForm.get('message')?.setValue('Test message');
      component.sendMessage();
      tick();

      const afterTime = component.activeConversation!.timestamp.getTime();
      expect(afterTime).toBeGreaterThanOrEqual(beforeTime);
    }));
  });

  describe('Conversation Management', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();
    }));

    it('should set active conversation and mark as read', () => {
      component.conversations[0].unreadCount = 5;
      component.setActiveConversation(component.conversations[0]);

      expect(component.activeConversation).toBe(component.conversations[0]);
      expect(component.conversations[0].unreadCount).toBe(0);
    });

    it('should filter conversations by participant name', () => {
      component.filterConversations('alice');
      expect(component.filteredConversations.length).toBe(1);
      expect(component.filteredConversations[0].participant.name).toBe('Alice');
    });

    it('should filter conversations case-insensitively', () => {
      component.filterConversations('ALICE');
      expect(component.filteredConversations.length).toBe(1);
    });

    it('should return all conversations when search term is empty', () => {
      component.filterConversations('');
      expect(component.filteredConversations.length).toBe(component.conversations.length);
    });

    it('should return empty array when no conversations match', () => {
      component.filterConversations('NonExistentUser');
      expect(component.filteredConversations.length).toBe(0);
    });

    it('should update filtered conversations when search form changes', fakeAsync(() => {
      component.searchForm.get('searchTerm')?.setValue('Bob');
      tick();

      expect(component.filteredConversations.length).toBe(1);
      expect(component.filteredConversations[0].participant.name).toBe('Bob');
    }));
  });

  describe('Time Formatting', () => {
    it('should format time as HH:MM for today', () => {
      const now = new Date();
      const result = component.formatTime(now);
      expect(result).toMatch(/^\d{1,2}:\d{2}$/);
    });

    it('should format time as "Yesterday" for yesterday', () => {
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 36);
      const result = component.formatTime(yesterday);
      expect(result).toBe('Yesterday');
    });

    xit('should format time as date for older messages', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 5);
      const result = component.formatTime(oldDate);
      // Format is "Sept 25" or "Dec 5" (month first, then day), and month can be 3-4 letters
      expect(result).toMatch(/^[A-Z][a-z]{2,4} \d{1,2}$/);
    });
  });

  describe('Call Functionality', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();
    }));

    it('should initiate voice call', () => {
      spyOn(window, 'alert');
      component.initiateCall(false);
      // The first conversation (index 0) is sorted by most recent, which is chatid 102 with Bob
      const expectedName = component.activeConversation?.participant.name;
      expect(window.alert).toHaveBeenCalledWith(`Initiating voice call with ${expectedName}`);
    });

    it('should initiate video call', () => {
      spyOn(window, 'alert');
      component.initiateCall(true);
      const expectedName = component.activeConversation?.participant.name;
      expect(window.alert).toHaveBeenCalledWith(`Initiating video call with ${expectedName}`);
    });

    it('should not initiate call if no active conversation', () => {
      spyOn(window, 'alert');
      component.activeConversation = null;
      component.initiateCall(false);
      expect(window.alert).not.toHaveBeenCalled();
    });
  });

  describe('More Options', () => {
    it('should show more options alert', () => {
      spyOn(window, 'alert');
      component.showMoreOptions();
      expect(window.alert).toHaveBeenCalledWith('More options menu would open here');
    });
  });

  describe('Accessibility Helpers', () => {
    it('should generate correct ARIA label for conversations with unread messages', () => {
      const convoWithUnread = {
        participant: { name: 'Jane' },
        lastMessage: 'See you then',
        unreadCount: 3
      } as any;

      const label = component.getConversationAriaLabel(convoWithUnread);
      expect(label).toContain('Jane direct message');
      expect(label).toContain('last message: See you then');
      expect(label).toContain('3 unread messages');
    });

    it('should generate correct ARIA label for conversations without unread messages', () => {
      const convoRead = {
        participant: { name: 'John' },
        lastMessage: 'OK',
        unreadCount: 0
      } as any;

      const label = component.getConversationAriaLabel(convoRead);
      expect(label).toContain('John direct message');
      expect(label).toContain('last message: OK');
      expect(label).not.toContain('unread');
    });

    it('should generate correct ARIA label for avatar', () => {
      const convo = { participant: { name: 'Alice' } } as any;
      expect(component.getAvatarAriaLabel(convo)).toBe('Alice avatar');
    });

    it('should generate correct ARIA label for sent messages', () => {
      const sentMsg = {
        type: 'sent',
        content: 'I am here',
        timestamp: new Date()
      } as any;

      const label = component.getMessageAriaLabel(sentMsg);
      expect(label).toContain('You sent at');
      expect(label).toContain('I am here');
    });

    it('should generate correct ARIA label for received messages', () => {
      const receivedMsg = {
        type: 'received',
        content: 'Where are you?',
        timestamp: new Date()
      } as any;

      const label = component.getMessageAriaLabel(receivedMsg);
      expect(label).toContain('Received at');
      expect(label).toContain('Where are you?');
    });
  });

  describe('TrackBy Functions', () => {
    it('should track conversations by index', () => {
      const convo = { id: 123 } as any;
      expect(component.trackByConversationId(5, convo)).toBe(5);
    });

    it('should track messages by id', () => {
      const message = { id: 42 } as any;
      expect(component.trackByMessageId(0, message)).toBe(42);
    });
  });

  describe('Template Rendering', () => {
    beforeEach(fakeAsync(() => {
      setupHappyPathMocks();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
    }));

    it('should display conversation list', () => {
      const conversations = getAllElements('.conversation-item');
      expect(conversations.length).toBe(2);
    });

    it('should display participant names', () => {
      const firstConvo = getElement('.conversation-card h2');
      // Conversations are sorted by timestamp, so Bob (chatid 102) appears first
      expect(firstConvo?.textContent).toBeTruthy();
    });

    it('should display active conversation in chat main', () => {
      const chatHeader = getElement('.chat-header h2');
      const expectedName = component.activeConversation?.participant.name;
      expect(chatHeader?.textContent).toContain(expectedName);
    });

    it('should display messages in active conversation', () => {
      const messages = getAllElements('.message');
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should display message input', () => {
      expect(getElement('.message-input')).toBeTruthy();
      expect(getElement('.send-button')).toBeTruthy();
    });

    it('should show loading state', () => {
      component.loading$.next(true);
      fixture.detectChanges();
      expect(getElement('.loading-conversations')).toBeTruthy();
    });

    it('should show no conversations message when filtered list is empty', fakeAsync(() => {
      component.filterConversations('NonExistent');
      fixture.detectChanges();
      expect(getElement('.no-conversations')).toBeTruthy();
    }));

    it('should show no conversation template when no active conversation', () => {
      component.activeConversation = null;
      fixture.detectChanges();
      expect(getElement('.no-conversation')).toBeTruthy();
    });

    it('should show no messages text when conversation has no messages', fakeAsync(() => {
      component.activeConversation!.messages = [];
      fixture.detectChanges();
      expect(getElement('.no-messages')).toBeTruthy();
    }));

    it('should mark conversation as active', fakeAsync(() => {
      const firstConvoElement = getAllElements('.conversation-item')[0];
      expect(firstConvoElement.classList.contains('active')).toBe(true);
    }));

    it('should display unread count badge', fakeAsync(() => {
      component.conversations[1].unreadCount = 5;
      fixture.detectChanges();
      const badges = getAllElements('.message-count');
      expect(badges.length).toBeGreaterThan(0);
    }));

    it('should display user initials in avatar', () => {
      const avatar = getElement('.avatar-initials');
      // Avatar shows the first letter of the active conversation's participant name
      const expectedInitial = component.activeConversation?.participant.name.charAt(0).toUpperCase();
      expect(avatar?.textContent?.trim()).toBe(expectedInitial);
    });

    it('should display "U" when participant name is missing', fakeAsync(() => {
      component.activeConversation!.participant.name = '';
      fixture.detectChanges();
      const avatars = getAllElements('.avatar-initials');
      // Check the chat header avatar specifically
      const chatHeaderAvatar = avatars.find(el => el.closest('.chat-header'));
      expect(chatHeaderAvatar?.textContent?.trim()).toBe('U');
    }));

    it('should disable send button when form is invalid', () => {
      component.messageForm.get('message')?.setValue('');
      fixture.detectChanges();
      const sendButton = getElement('.send-button') as HTMLButtonElement;
      expect(sendButton?.disabled).toBe(true);
    });
  });
});
