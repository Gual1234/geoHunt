import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useGameStore } from '@/store/gameStore';
import { getSocket } from '@/lib/socket';
import { ChatMessagePayload } from '@/types';
import dayjs from 'dayjs';

interface ChatPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ChatPanel = ({ isVisible, onClose }: ChatPanelProps) => {
  const { chatMessages, playerId } = useGameStore();
  const [message, setMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (chatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages]);

  const handleSend = () => {
    if (!message.trim()) return;

    const socket = getSocket();
    const payload: ChatMessagePayload = { message: message.trim() };
    socket.emit('chatMessage', payload);

    setMessage('');
  };

  if (!isVisible) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 Chat</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={chatMessages}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        renderItem={({ item }) => {
          const isMe = item.playerId === playerId;
          return (
            <View
              style={[
                styles.messageContainer,
                isMe ? styles.myMessage : styles.otherMessage,
              ]}
            >
              {!isMe && (
                <Text style={styles.messageName}>{item.playerName}</Text>
              )}
              <Text style={styles.messageText}>{item.message}</Text>
              <Text style={styles.messageTime}>
                {dayjs(item.timestamp).format('HH:mm')}
              </Text>
            </View>
          );
        }}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          maxLength={200}
        />
        <TouchableOpacity
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(28, 30, 31, 1)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 20,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgb(82, 83, 83)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#7F8C8D',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3498DB',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(28, 30, 31, 1)',
  },
  messageName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 10,
    color: '#ffffff',
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BDC3C7',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgb(82, 83, 83)',
    backgroundColor: 'rgba(28, 30, 31, 1)',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: 'rgba(35, 41, 44, 1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
    borderColor: 'rgb(82, 83, 83)',
    borderWidth: 1,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: 'rgba(35, 41, 44, 1)',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    borderColor: 'rgb(82, 83, 83)',
    borderWidth: 1,
    backgroundColor: 'rgba(35, 41, 44, 1)',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});







