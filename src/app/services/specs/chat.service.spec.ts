import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ChatService, Chat, ChatMessage } from '../chat.service';
import { environment } from '../../../environments/environment.prod';

describe('ChatService', () => {
  let service: ChatService;
  let httpMock: HttpTestingController;
  const apiBaseUrl = environment.apiBaseUrl;

  // --- MOCK DATA ---
  const mockChats: Chat[] = [
    { chatid: 1, user1: { userid: 'user-1' } as any, user2: { userid: 'user-2' } as any },
    { chatid: 2, user1: { userid: 'user-1' } as any, user2: { userid: 'user-3' } as any }
  ];

  const mockMessages: ChatMessage[] = [
    { messageid: 101, chatid: 1, message: 'Hello!', senderid: 'user-2', sent_datetime: new Date(), read_status: false },
    { messageid: 102, chatid: 1, message: 'Hi there!', senderid: 'user-1', sent_datetime: new Date(), read_status: false }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ChatService]
    });
    service = TestBed.inject(ChatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify that there are no outstanding HTTP requests after each test
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getChatById', () => {
    it('should make a GET request to the correct chat endpoint', () => {
      const testUserId = 'user-1';

      service.getChatById(testUserId).subscribe(chats => {
        expect(chats.length).toBe(2);
        expect(chats).toEqual(mockChats);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/chat/getChat?userid=${testUserId}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.has('Authorization')).toBe(true);

      req.flush(mockChats);
    });
  });

  describe('getMessagesByChatId', () => {
    it('should make a GET request to the correct message endpoint', () => {
      const testChatId = 1;

      service.getMessagesByChatId(testChatId).subscribe(messages => {
        expect(messages).toEqual(mockMessages);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/chatMessage/getMessage?chatid=${testChatId}`);
      expect(req.request.method).toBe('GET');

      req.flush(mockMessages);
    });
  });

  describe('createMessage', () => {
    it('should make a POST request to send a message', () => {
      const newMessage: ChatMessage = {
        messageid: 0, // Typically set by the backend
        chatid: 1,
        senderid: 'user-1',
        message: 'This is a test message',
        sent_datetime: new Date(),
        read_status: false
      };

      const expectedResponse = { ...newMessage, messageid: 103 }; // What the backend might return

      service.createMessage(newMessage).subscribe(response => {
        expect(response).toEqual(expectedResponse);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/chatMessage/sendMessage`);
      expect(req.request.method).toBe('POST');
      // Ensure the body sent to the API matches the structure in the service method
      expect(req.request.body.senderid).toEqual(newMessage.senderid);
      expect(req.request.body.message).toEqual(newMessage.message);

      req.flush(expectedResponse);
    });
  });

  describe('createChat', () => {
    it('should make a POST request to create a chat', () => {
      const newChatPayload = {
        user1: { userid: 'user-1' },
        user2: { userid: 'user-4' }
      };
      const expectedResponse: Chat = {
        chatid: 3,
        user1: { userid: 'user-1' } as any,
        user2: { userid: 'user-4' } as any
      };

      service.createChat(newChatPayload).subscribe(response => {
        expect(response).toEqual(expectedResponse);
      });

      const req = httpMock.expectOne(`${apiBaseUrl}/api/chat/createChat`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newChatPayload);

      req.flush(expectedResponse);
    });
  });
});
