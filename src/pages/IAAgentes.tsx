import { useState, useEffect } from 'react';
import { Bot, Brain, Shield, Activity, Plug, FileCheck, Eye, Plus, Loader2, Send, Trash2 } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

type AgentType = 'financial' | 'security' | 'monitoring' | 'integration' | 'compliance' | 'guardian';

interface TrainingRule {
  id: string;
  rule_name: string;
  rule_type: string;
  rule_content: string;
  priority: number;
  is_active: boolean;
  version: number;
  created_at: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  agent?: AgentType;
}

const agentConfig: Record<AgentType, { icon: typeof Bot; label: string; description: string }> = {
  financial: {
    icon: Brain,
    label: 'IA Financeira',
    description: 'Análise de transações, tendências e previsões',
  },
  security: {
    icon: Shield,
    label: 'IA de Segurança',
    description: 'Detecção de anomalias e análise de logs',
  },
  monitoring: {
    icon: Activity,
    label: 'IA de Monitoramento',
    description: 'Saúde do sistema e prevenção de falhas',
  },
  integration: {
    icon: Plug,
    label: 'IA de Integrações',
    description: 'Status e diagnóstico de conexões',
  },
  compliance: {
    icon: FileCheck,
    label: 'IA de Compliance',
    description: 'LGPD e conformidade regulatória',
  },
  guardian: {
    icon: Eye,
    label: 'IA Guardiã',
    description: 'Supervisão e validação de respostas',
  },
};

export default function IAAgentes() {
  const { session } = useAuth();
  const { toast } = useToast();
  
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('financial');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Training rules state
  const [rules, setRules] = useState<TrainingRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [newRule, setNewRule] = useState({
    rule_name: '',
    rule_type: 'financial' as AgentType,
    rule_content: '',
    priority: 0,
  });

  useEffect(() => {
    fetchRules();
  }, [session?.user?.id]);

  const fetchRules = async () => {
    if (!session?.user?.id) return;
    
    setLoadingRules(true);
    try {
      const { data, error } = await supabase
        .from('ai_training_rules')
        .select('*')
        .eq('user_id', session.user.id)
        .order('priority', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoadingRules(false);
    }
  };

  const handleAskAgent = async () => {
    if (!question.trim() || !session?.access_token) return;

    const userMessage: ChatMessage = { role: 'user', content: question, agent: selectedAgent };
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-multi-agent', {
        body: { agent: selectedAgent, question: question },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data?.answer || 'Não foi possível obter uma resposta.',
        agent: selectedAgent,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error asking agent:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Erro ao processar sua pergunta. Tente novamente.',
        agent: selectedAgent,
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao comunicar com o agente',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.rule_name || !newRule.rule_content) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Preencha nome e conteúdo da regra',
      });
      return;
    }

    try {
      const { error } = await supabase.from('ai_training_rules').insert({
        user_id: session?.user?.id,
        rule_name: newRule.rule_name,
        rule_type: newRule.rule_type,
        rule_content: newRule.rule_content,
        priority: newRule.priority,
      });

      if (error) throw error;

      toast({
        title: 'Regra criada',
        description: 'A regra de treinamento foi adicionada',
      });

      setNewRule({ rule_name: '', rule_type: 'financial', rule_content: '', priority: 0 });
      fetchRules();
    } catch (error) {
      console.error('Error creating rule:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao criar regra',
      });
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_training_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Regra removida',
        description: 'A regra foi excluída com sucesso',
      });
      fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao excluir regra',
      });
    }
  };

  const AgentIcon = agentConfig[selectedAgent].icon;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agentes de IA</h1>
          <p className="text-muted-foreground">Sistema multi-agente para análise inteligente</p>
        </div>

        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="chat" className="gap-2">
              <Bot className="w-4 h-4" />
              Chat com Agentes
            </TabsTrigger>
            <TabsTrigger value="training" className="gap-2">
              <Brain className="w-4 h-4" />
              Treinamento
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Agent Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Selecionar Agente</h3>
                <div className="space-y-2">
                  {(Object.entries(agentConfig) as [AgentType, typeof agentConfig[AgentType]][]).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedAgent(key)}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          selectedAgent === key
                            ? 'bg-primary/20 border-2 border-primary'
                            : 'bg-secondary hover:bg-secondary/80 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${selectedAgent === key ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div>
                            <p className="font-medium text-foreground">{config.label}</p>
                            <p className="text-xs text-muted-foreground">{config.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chat Area */}
              <div className="lg:col-span-3 glass-card p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                  <AgentIcon className="w-6 h-6 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">{agentConfig[selectedAgent].label}</p>
                    <p className="text-sm text-muted-foreground">{agentConfig[selectedAgent].description}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="h-96 overflow-y-auto space-y-4 mb-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Inicie uma conversa com o agente</p>
                        <p className="text-sm text-muted-foreground">Faça perguntas sobre seus dados reais</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-foreground'
                          }`}
                        >
                          {msg.role === 'assistant' && msg.agent && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {agentConfig[msg.agent].label}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-secondary p-3 rounded-lg">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Faça uma pergunta ao agente..."
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAskAgent()}
                    disabled={loading}
                  />
                  <Button onClick={handleAskAgent} disabled={loading || !question.trim()}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Rule */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Nova Regra de Treinamento
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da Regra</Label>
                    <Input
                      value={newRule.rule_name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, rule_name: e.target.value }))}
                      placeholder="Ex: Priorizar despesas operacionais"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Agente</Label>
                    <Select
                      value={newRule.rule_type}
                      onValueChange={(value) => setNewRule(prev => ({ ...prev, rule_type: value as AgentType }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(agentConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade (0-100)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newRule.priority}
                      onChange={(e) => setNewRule(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conteúdo da Regra</Label>
                    <Textarea
                      value={newRule.rule_content}
                      onChange={(e) => setNewRule(prev => ({ ...prev, rule_content: e.target.value }))}
                      placeholder="Descreva a regra que o agente deve seguir..."
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleCreateRule} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Regra
                  </Button>
                </div>
              </div>

              {/* Rules List */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Regras Ativas ({rules.length})
                </h3>
                {loadingRules ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : rules.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma regra criada</p>
                    <p className="text-sm text-muted-foreground">Crie regras para personalizar os agentes</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {rules.map((rule) => (
                      <div key={rule.id} className="p-4 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-foreground">{rule.rule_name}</p>
                              <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">
                                {agentConfig[rule.rule_type as AgentType]?.label || rule.rule_type}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs bg-secondary text-muted-foreground">
                                P{rule.priority}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{rule.rule_content}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
