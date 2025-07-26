// API service for communicating with the ADK coordinator agent

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ChatMessage {
  message: string;
  session_id?: string;
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  title: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
      borderWidth?: number;
    }>;
  };
}

export interface AgentResponse {
  response: string;
  agent_name?: string;
  status: 'success' | 'error';
  error?: string;
  routing_info?: {
    called_agent: string;
    routing_message: string;
  };
  charts?: ChartData[];
}

class ApiService {
  private sessionId: string;
  private userId: string;
  private sessionCreated: boolean = false;

  constructor() {
    // Generate unique identifiers for this session
    this.userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async ensureSession(): Promise<void> {
    if (this.sessionCreated) {
      console.log('Session already exists, skipping creation');
      return;
    }

    try {
      console.log('Creating ADK session...');
      console.log('Session URL:', `${API_BASE_URL}/apps/coordinator/users/${this.userId}/sessions/${this.sessionId}`);
      console.log('User ID:', this.userId);
      console.log('Session ID:', this.sessionId);
      
      const response = await fetch(`${API_BASE_URL}/apps/coordinator/users/${this.userId}/sessions/${this.sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: null }),
      });

      console.log('Session creation response status:', response.status);
      console.log('Session creation response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Session creation failed response:', errorText);
        throw new Error(`Session creation failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const sessionData = await response.json();
      console.log('Session created successfully:', sessionData);
      this.sessionCreated = true;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw new Error(`Failed to create session: ${error}`);
    }
  }

  async sendMessage(message: string): Promise<AgentResponse> {
    try {
      console.log('🚀 Starting sendMessage with:', message);
      
      // Ensure session is created before sending message
      console.log('📋 Ensuring session exists...');
      await this.ensureSession();
      console.log('✅ Session ensured, proceeding with message');

      // Use ADK's /run_sse endpoint for streaming responses
      console.log('📤 Sending request to /run_sse...');
      
      const requestBody = {
        appName: 'coordinator',
        userId: this.userId,
        sessionId: this.sessionId,
        newMessage: {
          role: 'user',
          parts: [{
            text: message
          }]
        },
        streaming: true
      };
      
      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${API_BASE_URL}/run_sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📨 Request sent, response status:', response.status);
      console.log('📨 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      // Handle Server-Sent Events (SSE) streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullResponse = '';
      let agentName = 'coordinator_agent';
      let buffer = '';
      let routingInfo: { called_agent: string; routing_message: string } | undefined;
      let charts: ChartData[] = [];

      console.log('Starting to read SSE stream...');

      // Read the streaming response
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('SSE stream ended');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          console.log('SSE line:', line);
          
          if (line.startsWith('data: ')) {
            try {
              const dataContent = line.slice(6).trim();
              if (dataContent === '[DONE]') {
                console.log('Stream completed with [DONE]');
                continue;
              }

              const eventData = JSON.parse(dataContent);
              console.log('Parsed event data:', eventData);
              
              // Handle ADK's specific response format
              if (eventData.content && eventData.content.parts) {
                // Handle content.parts array from ADK response
                for (const part of eventData.content.parts) {
                  if (part.text) {
                    if (!eventData.partial) {
                      // Final complete response - use this as the definitive answer
                      fullResponse = part.text;
                      console.log('Final complete response:', part.text);
                    } else {
                      // Show partial responses immediately for faster streaming
                      fullResponse += part.text;
                      console.log('Partial response chunk:', part.text);
                    }
                    
                    // Parse charts from text content
                    const chartMatches = part.text.match(/```chart\n([\s\S]*?)\n```/g);
                    if (chartMatches) {
                      chartMatches.forEach(match => {
                        try {
                          const chartJson = match.replace(/```chart\n/, '').replace(/\n```/, '');
                          const chartData = JSON.parse(chartJson);
                          charts.push(chartData);
                          // Remove chart JSON from display text
                          fullResponse = fullResponse.replace(match, '');
                        } catch (e) {
                          console.warn('Failed to parse chart data:', e);
                        }
                      });
                    }
                  } else if (part.functionCall) {
                    // Handle function calls to sub-agents
                    const calledAgent = part.functionCall.name;
                    const callArgs = part.functionCall.args;
                    console.log('Function call detected:', calledAgent, callArgs);
                    
                    // Store routing information
                    const agentDisplayName = calledAgent.replace('_agent', '').replace('_', ' ');
                    routingInfo = {
                      called_agent: calledAgent,
                      routing_message: `🔄 Routing your request to ${agentDisplayName.toUpperCase()} specialist...`
                    };
                  } else if (part.functionResponse) {
                    // Handle function responses from sub-agents
                    const respondingAgent = part.functionResponse.name;
                    const agentResponse = part.functionResponse.response;
                    console.log('Function response from:', respondingAgent, agentResponse);
                    
                    // Extract the actual response text and update agent name
                    if (agentResponse && agentResponse.result) {
                      fullResponse = agentResponse.result;
                      agentName = respondingAgent;
                    }
                  }
                }
              }

              // Extract agent name from author field
              if (eventData.author) {
                agentName = eventData.author;
                console.log('Agent name:', agentName);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line, e);
            }
          } else if (line.startsWith('event: ')) {
            console.log('Event type:', line.slice(7));
          }
        }
      }
      
      console.log('Final response:', fullResponse);
      
      return {
        response: fullResponse || 'No response received',
        agent_name: agentName,
        status: 'success',
        routing_info: routingInfo,
        charts: charts.length > 0 ? charts : undefined,
      };
    } catch (error) {
      console.error('API Error:', error);
      return {
        response: 'Sorry, I encountered an error while processing your request. Please try again.',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Streaming version for real-time responses using ADK SSE
  async *streamMessage(message: string): AsyncGenerator<string, void, unknown> {
    try {
      // Ensure session is created before sending message
      await this.ensureSession();

      const response = await fetch(`${API_BASE_URL}/run_sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appName: 'coordinator',
          userId: this.userId,
          sessionId: this.sessionId,
          newMessage: {
            role: 'user',
            parts: [{
              text: message
            }]
          },
          streaming: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.content) {
                yield data.content;
              }
            } catch (e) {
              // Skip invalid JSON lines
              console.warn('Invalid JSON in stream:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming API Error:', error);
      yield 'Sorry, I encountered an error while processing your request.';
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // Reset session (useful for new conversations)
  resetSession(): void {
    this.userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionCreated = false;
  }
}

export const apiService = new ApiService();