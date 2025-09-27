"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import { Send, AlertTriangle } from "lucide-react"

interface ChatMessage {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

interface ChatPanelProps {
  onSubmitChat: (text: string) => void
  onEmergencyToggle: (enabled: boolean) => void
  emergencyMode: boolean
  isLoading?: boolean
  lastSearchResults?: number
  isUsingAI?: boolean
}

export function ChatPanel({ onSubmitChat, onEmergencyToggle, emergencyMode, isLoading = false, lastSearchResults = 0, isUsingAI = false }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "Hello! I can help you find emergency resources like shelters, food banks, and clinics. What do you need?",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [inputText, setInputText] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    onSubmitChat(inputText)
    setInputText("")

    // Add response after search completes
    setTimeout(() => {
      let responseText = "";
      if (lastSearchResults > 0) {
        const aiIndicator = isUsingAI ? " (AI-powered)" : " (keyword-based)";
        responseText = `I found ${lastSearchResults} ${lastSearchResults === 1 ? 'resource' : 'resources'} near you${aiIndicator}. Check the map for locations and details.`;
      } else if (emergencyMode) {
        responseText = "I'm searching for emergency shelters in your area...";
      } else {
        responseText = "I'm searching for resources near you...";
      }
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
    }, 1000)
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground mb-4">Google Storm</h1>

        {/* Emergency Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${emergencyMode ? "text-destructive" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium">Emergency Mode</span>
          </div>
          <Switch
            checked={emergencyMode}
            onCheckedChange={onEmergencyToggle}
            className="data-[state=checked]:bg-destructive"
          />
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
            <Card
              className={`max-w-[80%] p-3 ${
                message.isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              <p className="text-sm">{message.text}</p>
            </Card>
          </div>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask in English or Español…"
            className="flex-1 h-12 text-base"
          />
          <Button type="submit" size="lg" className="h-12 px-4" disabled={isLoading}>
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  )
}
