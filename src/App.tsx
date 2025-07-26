import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { apiService } from './services/api';
import ChartComponent from './components/Chart';

// Type definitions
interface ChartData {
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

interface Message {
  id: number;
  content: string;
  sender: string;
  timestamp: number;
  agentId?: string;
  agentName?: string;
  agentColor?: string;
  isThinking?: boolean;
  charts?: ChartData[];
  scenario?: string;
  error?: boolean;
}

interface FamilyMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  joinedAt: number;
}

interface PendingInvite {
  id: number;
  email: string;
  phone: string;
  status: string;
  timestamp: number;
}

interface Notification {
  id: number;
  type: string;
  message: string;
  timestamp: number;
  read: boolean;
  icon?: string;
  bgColor?: string;
  title?: string;
  description?: string;
  expandedContent?: string;
  clickHint?: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [collapsedAgents, setCollapsedAgents] = useState(new Set<string>());
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedNotification, setExpandedNotification] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<'individual' | 'family'>('individual');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [familyMessages, setFamilyMessages] = useState<Message[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);






  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    // Add user message
    const userMessage = {
      id: Date.now(),
      content: message,
      sender: 'user',
      timestamp: Date.now()
    };
    
    // Update messages based on current page
    if (currentPage === 'family') {
      setFamilyMessages(prev => [...prev, userMessage]);
    } else {
      setMessages(prev => [...prev, userMessage]);
    }
    setInputValue('');
    
    // Add coordinator thinking state
    const coordinatorThinking = {
      id: Date.now() + Math.random(),
      content: '',
      sender: 'agent',
      timestamp: Date.now(),
      agentId: 'coordinator',
      agentName: 'Coordinator Agent',
      agentColor: '#00C29F',
      isThinking: true
    };
    
    if (currentPage === 'family') {
      setFamilyMessages(prev => [...prev, coordinatorThinking]);
    } else {
      setMessages(prev => [...prev, coordinatorThinking]);
    }

    try {
      // Call the backend API through coordinator agent
      const response = await apiService.sendMessage(message);
      
      // Update the thinking message with routing info if available
      const updateMessages = (prev: Message[]) => {
        const newMessages = [...prev];
        const thinkingIndex = newMessages.findIndex(msg => 
          msg.agentId === 'coordinator' && msg.isThinking
        );
        
        if (thinkingIndex !== -1) {
          if (response.routing_info) {
            // Show routing message first
            newMessages[thinkingIndex] = {
              ...newMessages[thinkingIndex],
              content: response.routing_info.routing_message,
              isThinking: false,
              agentName: 'Coordinator Agent',
              error: response.status === 'error'
            };
          } else {
            // No routing, just show the response
            newMessages[thinkingIndex] = {
              ...newMessages[thinkingIndex],
              content: response.response,
              isThinking: false,
              agentName: response.agent_name || 'Coordinator Agent',
              error: response.status === 'error',
              charts: response.charts
            };
          }
        }
        
        return newMessages;
      };
      
      if (currentPage === 'family') {
        setFamilyMessages(updateMessages);
      } else {
        setMessages(updateMessages);
      }

      // If there was routing, add the specialist agent response as a separate message
      if (response.routing_info) {
        await sleep(1000); // Brief pause to show routing
        
        const specialistResponse = {
          id: Date.now() + Math.random(),
          content: response.response,
          sender: 'agent',
          timestamp: Date.now(),
          agentId: response.routing_info.called_agent,
          agentName: response.agent_name || response.routing_info.called_agent.replace('_', ' '),
          agentColor: response.routing_info.called_agent.includes('goal') ? '#29B6F6' : '#26C6DA',
          isThinking: false,
          charts: response.charts
        };
        
        if (currentPage === 'family') {
          setFamilyMessages(prev => [...prev, specialistResponse]);
        } else {
          setMessages(prev => [...prev, specialistResponse]);
        }
      }

      // Add final recommendation based on response content
      await sleep(500);
      const scenarioType = determineScenarioType(message);
      
      if (scenarioType !== 'simple_response') {
        const finalRecommendation = {
          id: Date.now() + Math.random(),
          content: '',
          sender: scenarioType === 'house_purchase' ? 'family_recommendation' : 'recommendation',
          timestamp: Date.now(),
          scenario: scenarioType
        };
        
        if (currentPage === 'family') {
          setFamilyMessages(prev => [...prev, finalRecommendation]);
        } else {
          setMessages(prev => [...prev, finalRecommendation]);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update thinking message with error
      const updateMessages = (prev: Message[]) => {
        const newMessages = [...prev];
        const thinkingIndex = newMessages.findIndex(msg => 
          msg.agentId === 'coordinator' && msg.isThinking
        );
        
        if (thinkingIndex !== -1) {
          newMessages[thinkingIndex] = {
            ...newMessages[thinkingIndex],
            content: 'Sorry, I encountered an error while processing your request. Please try again.',
            isThinking: false,
            error: true
          };
        }
        
        return newMessages;
      };
      
      if (currentPage === 'family') {
        setFamilyMessages(updateMessages);
      } else {
        setMessages(updateMessages);
      }
    }
    
    setIsProcessing(false);
  };

  // Helper function to determine scenario type from message and response
  const determineScenarioType = (message: string) => {
    const isBudgetOvershoot = message.toLowerCase().includes('overshooting') || message.toLowerCase().includes('overshoot');
    const isHousePurchase = message.toLowerCase().includes('house') || (message.toLowerCase().includes('buy') && message.toLowerCase().includes('2'));
    const isInvestmentPlanning = message.toLowerCase().includes('investment') || message.toLowerCase().includes('plan') || message.toLowerCase().includes('crore');
    
    if (isBudgetOvershoot) return 'budget_overshoot';
    if (isHousePurchase && currentPage === 'family') return 'house_purchase';
    if (isInvestmentPlanning) return 'investment_planning';
    
    return 'simple_response';
  };

  const handleToggleCollapse = (agentId: string) => {
    setCollapsedAgents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agentId)) {
        newSet.delete(agentId);
      } else {
        newSet.add(agentId);
      }
      return newSet;
    });
  };

  const getAgentDescription = (agentId: string) => {
    const descriptions = {
      coordinator: "Orchestrates multi-agent analysis",
      asset: "Analyzes assets and liabilities",
      budgeting: "Monitors spending and budgets",
      market: "Tracks market conditions",
      investment: "Recommends investment strategies",
      simulation: "Runs financial projections"
    };
    return descriptions[agentId as keyof typeof descriptions] || "Financial AI Agent";
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const toggleNotificationExpand = (notificationId: number) => {
    setExpandedNotification(expandedNotification === notificationId ? null : notificationId);
  };

  const notifications = [
    {
      id: 1,
      type: 'budget_alert',
      message: 'Entertainment spending is 60% over budget',
      timestamp: Date.now(),
      read: false,
      icon: '💰',
      bgColor: 'rgba(255, 183, 77, 0.2)',
      title: 'Budget Alert',
      description: 'Entertainment spending is 60% over budget',
      expandedContent: 'You\'ve spent ₹8,000 on entertainment this month vs your ₹5,000 budget. This affects your monthly savings by ₹3,000.',
      clickHint: 'Click to chat about budget optimization'
    },
    {
      id: 2,
      type: 'investment_opportunity',
      message: 'SIP increase recommended based on salary hike',
      timestamp: Date.now(),
      read: false,
      icon: '📈',
      bgColor: 'rgba(76, 175, 80, 0.2)',
      title: 'Investment Opportunity',
      description: 'SIP increase recommended based on salary hike',
      expandedContent: 'Your recent 15% salary increase allows for ₹3,000 additional monthly SIP. This could accelerate your wealth building by 2 years.',
      clickHint: 'Click to explore investment strategies'
    },
    {
      id: 3,
      type: 'expense_trend',
      message: 'Monthly expenses increased 12% over last quarter',
      timestamp: Date.now(),
      read: false,
      icon: '📊',
      bgColor: 'rgba(33, 150, 243, 0.2)',
      title: 'Expense Trend',
      description: 'Monthly expenses increased 12% over last quarter',
      expandedContent: 'Your monthly expenses have grown from ₹35,000 to ₹39,200. Main increases: Food delivery (+₹2,000), Subscriptions (+₹1,200), Transportation (+₹1,000).',
      clickHint: 'Click to analyze expense patterns'
    }
  ];

  const handleNotificationClick = (notification: Notification) => {
    setShowNotifications(false);
    let message = '';
    
    switch (notification.type) {
      case 'budget_alert':
        message = 'I\'ve been overshooting my entertainment budget. Can you help me optimize it?';
        break;
      case 'investment_opportunity':
        message = 'I got a salary hike recently. How should I adjust my investment strategy?';
        break;
      case 'expense_trend':
        message = 'My monthly expenses have increased. Can you analyze the pattern and suggest optimizations?';
        break;
      default:
        message = 'Can you help me with my finances?';
    }
    
    handleSendMessage(message);
  };

  const handleInviteMember = (email: string, phone: string) => {
    const newInvite = {
      id: Date.now(),
      email,
      phone,
      status: 'pending',
      timestamp: Date.now()
    };
    setPendingInvites(prev => [...prev, newInvite]);
    
    // Simulate auto-acceptance after 3 seconds for demo
    setTimeout(() => {
      setPendingInvites(prev => prev.filter(invite => invite.id !== newInvite.id));
      setFamilyMembers(prev => [...prev, {
        id: newInvite.id,
        name: email.split('@')[0],
        email,
        phone,
        joinedAt: Date.now()
      }]);
    }, 3000);
  };

  const handlePageChange = (page: 'individual' | 'family') => {
    setCurrentPage(page);
  };

  const ChatMessage = ({ message }: { message: Message }) => {
    const isCollapsed = message.agentId ? collapsedAgents.has(message.agentId) : false;
    
    if (message.sender === 'recommendation') {
      return <RecommendationCard message={message} />;
    }
    
    if (message.sender === 'family_recommendation') {
      return <FamilyRecommendationCard />;
    }
    
    if (message.sender === 'user') {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginBottom: '16px', 
          padding: '0 16px' 
        }}>
          <div style={{
            maxWidth: '85%',
            backgroundColor: 'var(--accent-primary)',
            color: 'white',
            borderRadius: '14px',
            borderBottomRightRadius: '4px',
            padding: '12px 16px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <p style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              lineHeight: '1.4', 
              margin: 0 
            }}>
              {message.content}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div style={{ 
        marginBottom: '16px', 
        padding: '0 16px' 
      }}>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '14px',
          padding: '16px',
          border: '1px solid var(--bg-border)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease'
        }}>
          {/* Agent Header */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              marginBottom: '12px',
              cursor: !message.isThinking ? 'pointer' : 'default'
            }}
            onClick={!message.isThinking && message.agentId ? () => handleToggleCollapse(message.agentId!) : undefined}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '12px',
              backgroundColor: message.agentColor,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '11px', height: '11px', color: 'white' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M21.33 12.95c0 5.64-3.28 10.52-8.04 12.9-.46.23-1.12.23-1.58 0C7.27 23.47 4 18.59 4 12.95c0-2.07.72-3.98 1.92-5.49-.04-.31-.08-.63-.08-.95C5.84 3.47 8.31 1 11.35 1c1.98 0 3.73 1.05 4.7 2.62C17.69 2.05 19.44 1 21.42 1c3.04 0 5.51 2.47 5.51 5.51 0 .32-.04.64-.08.95 1.2 1.51 1.92 3.42 1.92 5.49z"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                fontSize: '13px',
                margin: 0
              }}>
                {message.agentName}
              </h3>
              <p style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                margin: '2px 0 0 0'
              }}>
                {getAgentDescription(message.agentId || '')}
              </p>
            </div>
            {message.isThinking && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'var(--accent-primary)',
                    borderRadius: '50%',
                    animation: 'pulse 1s infinite'
                  }} />
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'var(--accent-primary)',
                    borderRadius: '50%',
                    animation: 'pulse 1s infinite',
                    animationDelay: '0.1s'
                  }} />
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'var(--accent-primary)',
                    borderRadius: '50%',
                    animation: 'pulse 1s infinite',
                    animationDelay: '0.2s'
                  }} />
                </div>
                <span style={{
                  fontSize: '12px',
                  color: 'var(--accent-primary)',
                  fontWeight: '500'
                }}>
                  Thinking
                </span>
              </div>
            )}
            {!message.isThinking && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                marginLeft: 'auto'
              }}>
                <svg 
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    color: 'var(--text-muted)',
                    transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                    transition: 'transform 0.2s ease'
                  }}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
          </div>

          {/* Message Content */}
          {message.isThinking ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '16px 0' 
            }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'var(--text-muted)',
                  borderRadius: '50%',
                  animation: 'pulse 1s infinite'
                }} />
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'var(--text-muted)',
                  borderRadius: '50%',
                  animation: 'pulse 1s infinite',
                  animationDelay: '0.15s'
                }} />
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'var(--text-muted)',
                  borderRadius: '50%',
                  animation: 'pulse 1s infinite',
                  animationDelay: '0.3s'
                }} />
              </div>
              <span style={{
                fontSize: '14px',
                color: 'var(--text-secondary)'
              }}>
                Analyzing your request...
              </span>
            </div>
          ) : (
            <div style={{ display: isCollapsed ? 'none' : 'block' }}>
              <div 
                style={{
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: 'var(--text-primary)',
                  margin: '0 0 8px 0'
                }}
                dangerouslySetInnerHTML={{ 
                  __html: marked(message.content || '', { 
                    breaks: true,
                    gfm: true 
                  }) 
                }}
              />
              
              {/* Render Charts */}
              {message.charts && message.charts.map((chart: ChartData, index: number) => (
                <ChartComponent key={index} chartData={chart} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const RecommendationCard = ({ message }: { message: Message }) => {
    const isInvestmentPlanning = message.scenario === 'investment_planning';
    const isBudgetOvershoot = message.scenario === 'budget_overshoot';
    
    return (
      <div style={{ 
        marginBottom: '24px', 
        padding: '0 16px' 
      }}>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--bg-border)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '16px' 
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '12px',
              backgroundColor: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '18px', height: '18px', color: 'white' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div>
              <h3 style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                fontSize: '16px',
                margin: 0
              }}>
                {isInvestmentPlanning ? 'Investment Strategy' : 'Budget Optimization'}
              </h3>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                margin: '4px 0 0 0'
              }}>
                Final recommendation based on AI analysis
              </p>
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'var(--text-primary)',
              margin: '0 0 12px 0'
            }}>
              {isInvestmentPlanning ? 
                'Based on your profile analysis, here\'s your personalized investment strategy:' :
                'Here\'s your optimized budget plan to get back on track:'
              }
            </p>
            
            {isInvestmentPlanning && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  backgroundColor: 'rgba(0, 194, 159, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--accent-primary)' }}>70%</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Equity Funds</div>
                </div>
                <div style={{
                  backgroundColor: 'rgba(255, 193, 7, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#FFC107' }}>20%</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Gold</div>
                </div>
                <div style={{
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#4CAF50' }}>10%</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Debt</div>
                </div>
              </div>
            )}
            
            {isBudgetOvershoot && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#F44336' }}>₹3,000</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Over Budget</div>
                </div>
                <div style={{
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#FF9800' }}>₹5,000</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>New Limit</div>
                </div>
                <div style={{
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#4CAF50' }}>₹2,000</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Monthly Save</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Trend Chart */}
          <div style={{
            backgroundColor: 'rgba(42, 42, 42, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: '0 0 16px 0'
            }}>
              {isInvestmentPlanning ? 'Networth Growth Trend' : 'Monthly Budget Trend'}
            </h4>
            <div style={{ 
              position: 'relative',
              height: isInvestmentPlanning ? '140px' : '60px',
              paddingLeft: isInvestmentPlanning ? '40px' : '0',
              paddingBottom: '20px'
            }}>
              {isInvestmentPlanning ? (
                // Enhanced trend line chart for investment planning
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  {/* Y-axis labels */}
                  <div style={{ 
                    position: 'absolute', 
                    left: '0', 
                    top: '0', 
                    bottom: '20px', 
                    width: '35px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end'
                  }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>₹5Cr</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>₹4Cr</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>₹3Cr</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>₹2Cr</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>₹1Cr</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>₹0</span>
                  </div>
                  
                  {/* Chart area */}
                  <div style={{ 
                    position: 'absolute',
                    left: '40px',
                    top: '0',
                    right: '0',
                    bottom: '20px'
                  }}>
                    <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#00C29F', stopOpacity: 0.3 }} />
                          <stop offset="100%" style={{ stopColor: '#00C29F', stopOpacity: 0.05 }} />
                        </linearGradient>
                      </defs>
                      
                      {/* Grid lines */}
                      {[...Array(6)].map((_, i) => (
                        <line
                          key={i}
                          x1="0"
                          y1={i * 24}
                          x2="100%"
                          y2={i * 24}
                          stroke="rgba(255, 255, 255, 0.1)"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                        />
                      ))}
                      
                      {/* Trend line */}
                      <polyline
                        fill="none"
                        stroke="#00C29F"
                        strokeWidth="3"
                        points={[...Array(16)].map((_, i) => {
                          const x = (i / 15) * 100;
                          const y = 100 - (i * 5); // Start from bottom and go up
                          return `${x},${Math.max(10, y)}`;
                        }).join(' ')}
                      />
                      
                      {/* Area under the curve */}
                      <polygon
                        fill="url(#trendGradient)"
                        points={[
                          '0,110',
                          ...[...Array(16)].map((_, i) => {
                            const x = (i / 15) * 100;
                            const y = 100 - (i * 5);
                            return `${x},${Math.max(10, y)}`;
                          }),
                          '100,110'
                        ].join(' ')}
                      />
                      
                      {/* Data points - only show key milestones */}
                      {[0, 5, 10, 15].map((year) => {
                        const i = year;
                        const x = (i / 15) * 100;
                        const y = 100 - (i * 5);
                        return (
                          <circle
                            key={i}
                            cx={x}
                            cy={Math.max(10, y)}
                            r="4"
                            fill="#00C29F"
                            stroke="#1a1a1a"
                            strokeWidth="2"
                          />
                        );
                      })}
                    </svg>
                  </div>
                  
                  {/* X-axis labels */}
                  <div style={{ 
                    position: 'absolute',
                    bottom: '0',
                    left: '40px',
                    right: '0',
                    height: '15px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Y1</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Y5</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Y10</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Y15</span>
                  </div>
                </div>
              ) : (
                // Bar chart for budget trend
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'end', 
                  gap: '4px', 
                  height: '100%'
                }}>
                  {[...Array(12)].map((_, i) => {
                    const height = Math.max(10, 30 - (i > 8 ? (i - 8) * 8 : 0));
                    return (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          backgroundColor: i <= 8 ? '#FF9800' : 'var(--accent-primary)',
                          height: `${height}px`,
                          borderRadius: '2px',
                          opacity: i <= 8 ? 1 : 0.7
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'rgba(0, 194, 159, 0.1)',
            padding: '12px',
            borderRadius: '8px',
            borderLeft: '3px solid var(--accent-primary)'
          }}>
            <p style={{
              fontSize: '13px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              margin: '0 0 4px 0'
            }}>
              {isInvestmentPlanning ? 
                '💡 Key Insight: With consistent ₹20K monthly investments, you can reach ₹5 crores by age 40' :
                '💡 Key Insight: Reducing entertainment spend by 37% saves ₹24K annually for investments'
              }
            </p>
          </div>
        </div>
      </div>
    );
  };

  const FamilyRecommendationCard = () => {
    return (
      <div style={{ 
        marginBottom: '24px', 
        padding: '0 16px' 
      }}>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--bg-border)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '16px' 
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '12px',
              backgroundColor: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '18px', height: '18px', color: 'white' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.5 7H16c-.8 0-1.56.31-2.12.88l-2.25 2.25C11.24 10.52 11 11.25 11 12v1.5c0 .83.67 1.5 1.5 1.5S14 14.33 14 13.5V12.85l1.73-1.73L17.5 18H15v2h5v-2h-2z"/>
              </svg>
            </div>
            <div>
              <h3 style={{
                fontWeight: '600',
                color: 'var(--text-primary)',
                fontSize: '16px',
                margin: 0
              }}>
                Family Home Purchase Plan
              </h3>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                margin: '4px 0 0 0'
              }}>
                Joint financial analysis for ₹2 crore house
              </p>
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'var(--text-primary)',
              margin: '0 0 12px 0'
            }}>
              Based on combined family analysis, here's your home purchase feasibility:
            </p>
            
            {/* Comparison Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(244, 67, 54, 0.2)'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#F44336', margin: '0 0 8px 0' }}>
                  Individual Plan ❌
                </h4>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <div>Income: ₹60,000/month</div>
                  <div>EMI Capacity: ₹18,000</div>
                  <div>Required EMI: ₹1,20,000</div>
                </div>
                <div style={{ fontSize: '11px', color: '#F44336', fontWeight: '500' }}>
                  200% income ratio - Not feasible
                </div>
              </div>
              
              <div style={{
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(76, 175, 80, 0.2)'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#4CAF50', margin: '0 0 8px 0' }}>
                  Family Plan ✅
                </h4>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <div>Combined Income: ₹1,10,000/month</div>
                  <div>EMI Capacity: ₹32,000</div>
                  <div>Required EMI: ₹1,20,000</div>
                </div>
                <div style={{ fontSize: '11px', color: '#4CAF50', fontWeight: '500' }}>
                  29% income ratio - Feasible!
                </div>
              </div>
            </div>
          </div>
          

          {/* Action Plan */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              backgroundColor: 'rgba(0, 194, 159, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--accent-primary)' }}>₹1,67,000</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Monthly Family Savings</div>
            </div>
            <div style={{
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#2196F3' }}>8.5%</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Current Loan Rate</div>
            </div>
            <div style={{
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#4CAF50' }}>24 months</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>To Down Payment</div>
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'rgba(0, 194, 159, 0.1)',
            padding: '12px',
            borderRadius: '8px',
            borderLeft: '3px solid var(--accent-primary)'
          }}>
            <p style={{
              fontSize: '13px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              margin: '0 0 4px 0'
            }}>
              💡 Key Insight: Family planning makes your ₹2Cr house dream achievable! Combined income reduces EMI burden from 200% to 29% of income.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const FamilyInviteModal = ({ isOpen, onClose, onInvite }: { isOpen: boolean; onClose: () => void; onInvite: (email: string, phone: string) => void }) => {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (email && phone) {
        onInvite(email, phone);
        setEmail('');
        setPhone('');
        onClose();
      }
    };

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid var(--bg-border)'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            margin: '0 0 16px 0'
          }}>
            Invite Family Member
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
                required
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px'
                }}
                required
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Send Invite
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="user-avatar">
            KB
          </div>
          <div className="app-title">
            <h1>FiBuddy</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              className="notification-btn" 
              onClick={() => handlePageChange(currentPage === 'family' ? 'individual' : 'family')}
              style={{ 
                backgroundColor: currentPage === 'family' ? 'var(--accent-primary)' : 'var(--bg-card)'
              }}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ 
                color: currentPage === 'family' ? 'white' : 'var(--text-secondary)' 
              }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="notification-btn" onClick={toggleNotifications}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications.length > 0 && <div className="notification-dot" />}
            </div>
          </div>
        </div>
      </header>

      {/* Notification Panel */}
      {showNotifications && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3 className="notification-title">Proactive Insights</h3>
          </div>
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className="notification-item"
              onClick={() => toggleNotificationExpand(notification.id)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div 
                  className="notification-icon"
                  style={{ backgroundColor: notification.bgColor }}
                >
                  <span style={{ fontSize: '16px' }}>{notification.icon}</span>
                </div>
                <div className="notification-content">
                  <h4 className="notification-alert-title">{notification.title}</h4>
                  <p className="notification-alert-desc">{notification.description}</p>
                  
                  {expandedNotification === notification.id && (
                    <div className="notification-expand-content">
                      <p className="notification-expand-text">{notification.expandedContent}</p>
                      <p 
                        className="notification-click-hint"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(notification);
                        }}
                      >
                        {notification.clickHint}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {currentPage === 'individual' ? (
          // Individual Page
          messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-container">
                <div className="welcome-icon">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h2 className="welcome-title">Welcome to FiBuddy</h2>
                <p className="welcome-description">
                  Your AI-powered financial companion. Get personalized insights, budget optimization, and investment strategies tailored just for you.
                </p>
                <div className="welcome-buttons">
                  <button className="welcome-button" onClick={() => handleSendMessage('Help me create an investment plan to reach ₹5 crores by age 40')}>
                    <h4>💰 Investment Planning</h4>
                    <p>Get a personalized strategy to reach your financial goals</p>
                  </button>
                  <button className="welcome-button" onClick={() => handleSendMessage('I\'ve been overshooting my entertainment budget. Can you help me optimize it?')}>
                    <h4>📊 Budget Optimization</h4>
                    <p>Analyze spending patterns and optimize your budget</p>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="chat-messages">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )
        ) : (
          // Family Page
          <div>
            {/* Family Header */}
            <div style={{ padding: '24px 16px 16px', borderBottom: '1px solid var(--bg-border)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                Family Budgeting
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                Collaborate with family members on financial decisions and goals
              </p>
            </div>

            {/* Family Members Section */}
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                  Family Members ({familyMembers.length + 1})
                </h3>
                <button 
                  onClick={() => setShowInviteModal(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  + Add Member
                </button>
              </div>

              {/* Current User */}
              <div style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                border: '1px solid var(--bg-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600'
                  }}>
                    KB
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>You</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Primary Account Holder</div>
                  </div>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(0, 194, 159, 0.1)',
                    color: 'var(--accent-primary)',
                    fontSize: '10px',
                    fontWeight: '500'
                  }}>
                    ADMIN
                  </div>
                </div>
              </div>

              {/* Pending Invites */}
              {pendingInvites.map((invite) => (
                <div key={invite.id} style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                  border: '1px solid rgba(255, 152, 0, 0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      backgroundColor: '#FF9800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600'
                    }}>
                      {invite.email.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {invite.email}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {invite.phone}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 152, 0, 0.1)',
                      color: '#FF9800',
                      fontSize: '10px',
                      fontWeight: '500'
                    }}>
                      PENDING
                    </div>
                  </div>
                </div>
              ))}

              {/* Family Members */}
              {familyMembers.map((member) => (
                <div key={member.id} style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                  border: '1px solid var(--bg-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--accent-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600'
                    }}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {member.email}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      color: '#4CAF50',
                      fontSize: '10px',
                      fontWeight: '500'
                    }}>
                      ACTIVE
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Family Chat */}
            {familyMembers.length > 0 && (
              <div style={{ borderTop: '1px solid var(--bg-border)', padding: '16px 0 0' }}>
                <div style={{ padding: '0 16px 16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                    Family Financial Chat
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    Discuss financial goals and get joint recommendations
                  </p>
                </div>
                
                {familyMessages.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: 'rgba(0, 194, 159, 0.2)',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px'
                    }}>
                      <svg style={{ width: '24px', height: '24px', color: 'var(--accent-primary)' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                      </svg>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                      Start planning together! Try asking about buying a house or other family financial goals.
                    </p>
                  </div>
                ) : (
                  <div className="chat-messages">
                    {familyMessages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Chat Input */}
      <div className="chat-input">
        <form 
          className="chat-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (inputValue.trim() && !isProcessing) {
              handleSendMessage(inputValue);
            }
          }}
        >
          <div className="chat-input-container">
            <button type="button" className="voice-button">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <div className="input-wrapper">
              <textarea
                className="message-input"
                placeholder="Ask me anything about your finances..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputValue.trim() && !isProcessing) {
                      handleSendMessage(inputValue);
                    }
                  }
                }}
                disabled={isProcessing}
                rows={1}
                style={{
                  resize: 'none',
                  overflow: 'hidden',
                  minHeight: '44px'
                }}
              />
              <button 
                type="submit" 
                className={`send-button ${inputValue.trim() && !isProcessing ? 'active' : 'inactive'}`}
                disabled={!inputValue.trim() || isProcessing}
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Family Invite Modal */}
      <FamilyInviteModal 
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteMember}
      />
    </div>
  );
}

export default App;