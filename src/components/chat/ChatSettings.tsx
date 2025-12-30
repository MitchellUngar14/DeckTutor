'use client';

import { Settings, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  GEMINI_MODELS,
  OPENAI_MODELS,
  COMMANDER_BRACKETS,
  type AIProvider,
  type AIModel,
  type CommanderBracket,
  type ChatSettings as ChatSettingsType,
} from '@/types';

interface ChatSettingsProps {
  settings: ChatSettingsType;
  onSettingsChange: (settings: Partial<ChatSettingsType>) => void;
  onClearConversation: () => void;
  hasDeckContext: boolean;
}

const PROVIDERS: Record<AIProvider, { name: string; description: string }> = {
  openai: { name: 'OpenAI', description: 'GPT-4o, o1, o3' },
  gemini: { name: 'Google Gemini', description: 'Gemini 2.5, 2.0' },
};

export function ChatSettings({
  settings,
  onSettingsChange,
  onClearConversation,
  hasDeckContext,
}: ChatSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get models for current provider
  const currentModels = settings.provider === 'openai' ? OPENAI_MODELS : GEMINI_MODELS;

  // Get display name for current model
  const getModelName = () => {
    if (settings.provider === 'openai') {
      return OPENAI_MODELS[settings.model as keyof typeof OPENAI_MODELS]?.name || settings.model;
    }
    return GEMINI_MODELS[settings.model as keyof typeof GEMINI_MODELS]?.name || settings.model;
  };

  // Handle provider change - also update model to first available for that provider
  const handleProviderChange = (provider: AIProvider) => {
    const defaultModel = provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash';
    onSettingsChange({ provider, model: defaultModel });
  };

  return (
    <div className="border-b bg-muted/30">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm">
          <Settings className="h-4 w-4" />
          <span className="font-medium">Chat Settings</span>
          <span className="text-muted-foreground">
            ({getModelName()}, Bracket {settings.bracketLevel})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Expanded settings */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Provider selector */}
          <div className="space-y-2">
            <Label htmlFor="provider-select">AI Provider</Label>
            <Select
              value={settings.provider}
              onValueChange={(value) => handleProviderChange(value as AIProvider)}
            >
              <SelectTrigger id="provider-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROVIDERS).map(([key, { name, description }]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col">
                      <span>{name}</span>
                      <span className="text-xs text-muted-foreground">
                        {description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model selector */}
          <div className="space-y-2">
            <Label htmlFor="model-select">AI Model</Label>
            <Select
              value={settings.model}
              onValueChange={(value) => onSettingsChange({ model: value as AIModel })}
            >
              <SelectTrigger id="model-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(currentModels).map(([key, { name, description }]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col">
                      <span>{name}</span>
                      <span className="text-xs text-muted-foreground">
                        {description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bracket level selector */}
          <div className="space-y-2">
            <Label htmlFor="bracket-select">Power Level (Bracket)</Label>
            <Select
              value={String(settings.bracketLevel)}
              onValueChange={(value) =>
                onSettingsChange({ bracketLevel: Number(value) as CommanderBracket })
              }
            >
              <SelectTrigger id="bracket-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COMMANDER_BRACKETS).map(([level, { name, description }]) => (
                  <SelectItem key={level} value={level}>
                    <div className="flex flex-col">
                      <span>
                        Bracket {level}: {name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Context toggle (only if deck context available) */}
          {hasDeckContext && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="context-toggle">Include Deck Context</Label>
                <p className="text-xs text-muted-foreground">
                  Share your deck list with the AI
                </p>
              </div>
              <Switch
                id="context-toggle"
                checked={settings.includeContext}
                onCheckedChange={(checked) =>
                  onSettingsChange({ includeContext: checked })
                }
              />
            </div>
          )}

          {/* Clear conversation */}
          <Button
            variant="outline"
            size="sm"
            onClick={onClearConversation}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Conversation
          </Button>
        </div>
      )}
    </div>
  );
}
