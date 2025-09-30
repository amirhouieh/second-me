"use client";

import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";

export type ChatInputHandle = {
  focus: () => void;
};

type ChatInputProps = {
  onSubmit: (query: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  ({ onSubmit, disabled, placeholder, className }, ref) => {
    const [value, setValue] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const q = value.trim();
      if (!q || disabled || submitting) return;
      try {
        setSubmitting(true);
        await onSubmit(q);
        setValue("");
      } finally {
        setSubmitting(false);
      }
    };

    const isDisabled = disabled || submitting;

    return (
      <form onSubmit={handleSubmit} className={className ? className : "flex gap-2"}>
        <Input
          ref={inputRef}
          className="flex-1 border-none shadow-none bg-white/70 backdrop-blur-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder={
            placeholder || "e.g., Who is Amir? / Show GitHub activity / Experience?"
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isDisabled}
        />
        <Button type="submit" disabled={isDisabled || !value.trim()}>
          {isDisabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    );
  }
);

ChatInput.displayName = "ChatInput";


