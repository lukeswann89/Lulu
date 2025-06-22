import React, { useMemo, useCallback, useState } from 'react';
import { createEditor, Descendant, Range, Editor, Transforms, Text, Node, BaseEditor } from 'slate';
import { Slate, Editable, withReact, ReactEditor, RenderLeafProps } from 'slate-react';
import { withHistory } from 'slate-history';
import { Box, Stack, Button, Text as ChakraText, Badge } from '@chakra-ui/react';
import type { StackProps } from '@chakra-ui/react';

// Types matching your experimental.js implementation
interface Suggestion {
  id: string;
  editType: string;
  original: string;
  suggestion: string;
  why: string;
  state: 'pending' | 'accepted' | 'rejected' | 'revised';
  start: number;
  end: number;
}

// Custom types for Slate
type CustomElement = { type: 'paragraph'; children: CustomText[] }
type CustomText = { text: string }

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor
    Element: CustomElement
    Text: CustomText
  }
}

interface SlateEditorProps {
  initialValue: string;
  initialSuggestions: Suggestion[];
  onSuggestionChange?: (suggestions: Suggestion[]) => void;
  onTextChange?: (text: string) => void;
}

const SlateEditor: React.FC<SlateEditorProps> = ({
  initialValue,
  initialSuggestions,
  onSuggestionChange,
  onTextChange
}) => {
  // Initialize the Slate editor
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  
  // Convert plain text to Slate's document structure
  const initialEditorValue = useMemo(() => {
    const paragraphs = initialValue.split('\n').map(line => ({
      type: 'paragraph' as const,
      children: [{ text: line }]
    }));
    return paragraphs;
  }, [initialValue]);

  // State management
  const [value, setValue] = useState<Descendant[]>(initialEditorValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initialSuggestions);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  // Handle editor changes
  const handleChange = useCallback((newValue: Descendant[]) => {
    setValue(newValue);
    // Convert Slate value back to plain text
    const plainText = newValue
      .map(n => Node.string(n))
      .join('\n');
    onTextChange?.(plainText);
  }, [onTextChange]);

  // Handle suggestion actions
  const handleAccept = useCallback((id: string) => {
    setSuggestions(prev => {
      const newSuggestions = prev.map(s => 
        s.id === id ? { ...s, state: 'accepted' as const } : s
      );
      onSuggestionChange?.(newSuggestions);
      return newSuggestions;
    });
  }, [onSuggestionChange]);

  const handleReject = useCallback((id: string) => {
    setSuggestions(prev => {
      const newSuggestions = prev.map(s => 
        s.id === id ? { ...s, state: 'rejected' as const } : s
      );
      onSuggestionChange?.(newSuggestions);
      return newSuggestions;
    });
  }, [onSuggestionChange]);

  const handleRevise = useCallback((id: string) => {
    const suggestion = suggestions.find(s => s.id === id);
    if (!suggestion) return;

    const revised = prompt("Enter your revision:", suggestion.suggestion);
    if (revised != null) {
      setSuggestions(prev => {
        const newSuggestions = prev.map(s => 
          s.id === id ? { ...s, state: 'revised' as const, suggestion: revised } : s
        );
        onSuggestionChange?.(newSuggestions);
        return newSuggestions;
      });
    }
  }, [suggestions, onSuggestionChange]);

  // Render each leaf (text node) with potential highlighting
  const renderLeaf = useCallback((props: RenderLeafProps) => {
    // The `props.leaf` is the text node. We cast to any to check for custom properties.
    const leaf = props.leaf as any;

    // A simplified check: does this leaf's text contain a pending suggestion?
    // Note: This is not a perfect implementation for overlapping or repeated suggestions.
    const suggestion = suggestions.find(
      s => s.state === 'pending' && leaf.text.includes(s.original)
    );

    if (suggestion) {
      return (
        <span
          {...props.attributes}
          style={{
            backgroundColor: '#ffe29b',
            padding: '0 2px',
            borderRadius: '3px',
            outline: activeHighlight === suggestion.id ? '2px solid #6366f1' : 'none',
          }}
          onMouseEnter={() => setActiveHighlight(suggestion.id)}
          onMouseLeave={() => setActiveHighlight(null)}
        >
          {props.children}
        </span>
      );
    }

    return <span {...props.attributes}>{props.children}</span>;
  }, [suggestions, activeHighlight]);

  return (
    <Box maxW="900px" mx="auto" p={6}>
      {/* Editor */}
      <Box
        border="1.5px solid"
        borderColor="purple.300"
        borderRadius="lg"
        p={4}
        bg="white"
        minH="200px"
        mb={4}
      >
        <Slate 
          editor={editor} 
          initialValue={value}
          onChange={handleChange}
        >
          <Editable
            renderLeaf={renderLeaf}
            style={{
              fontFamily: 'serif',
              fontSize: '18px',
              lineHeight: '1.6',
            }}
          />
        </Slate>
      </Box>

      {/* Suggestions */}
      <Box>
        <ChakraText fontSize="xl" fontWeight="bold" color="blue.600" mb={4}>
          Suggestions
        </ChakraText>
        {suggestions
          .filter(s => s.state === 'pending')
          .map((suggestion, index) => (
            <Box
              key={suggestion.id}
              bg="yellow.50"
              border="2px"
              borderColor="yellow.300"
              borderRadius="lg"
              p={4}
              mb={3}
              position="relative"
              outline={activeHighlight === suggestion.id ? "2px solid purple.500" : "none"}
              transition="outline 0.2s"
              _hover={{ outline: "2px solid purple.500" }}
              onMouseEnter={() => setActiveHighlight(suggestion.id)}
              onMouseLeave={() => setActiveHighlight(null)}
            >
              <Badge
                position="absolute"
                top={2}
                right={2}
                colorScheme="yellow"
                fontSize="md"
              >
                #{index + 1}
              </Badge>
              <Stack {...{ spacing: 2 } as StackProps}>
                <ChakraText>
                  <strong>Original:</strong>{" "}
                  <span style={{ color: "#991b1b" }}>{suggestion.original}</span>
                </ChakraText>
                <ChakraText>
                  <strong>Suggestion:</strong>{" "}
                  <span style={{ color: "#2563eb" }}>{suggestion.suggestion}</span>
                </ChakraText>
                <ChakraText>
                  <strong>Why:</strong>{" "}
                  <span style={{ color: "#059669" }}>{suggestion.why}</span>
                </ChakraText>
                <Stack {...{ direction: "row", spacing: 2 } as StackProps}>
                  <Button
                    colorScheme="green"
                    size="sm"
                    onClick={() => handleAccept(suggestion.id)}
                  >
                    Accept
                  </Button>
                  <Button
                    colorScheme="red"
                    size="sm"
                    onClick={() => handleReject(suggestion.id)}
                  >
                    Reject
                  </Button>
                  <Button
                    colorScheme="yellow"
                    size="sm"
                    onClick={() => handleRevise(suggestion.id)}
                  >
                    Revise
                  </Button>
                </Stack>
              </Stack>
            </Box>
          ))}
      </Box>
    </Box>
  );
};

export default SlateEditor; 