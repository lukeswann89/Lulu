import React from 'react';
import { Container, Heading } from '@chakra-ui/react';
import SlateEditor from '../components/SlateEditor';
import { v4 as uuidv4 } from 'uuid';

// Using the same test content as the original implementation
const defaultText = `"Please speak to me," Sylvia begged Virginia the following day.
Virginia was sitting at the makeshift desk, staring emptily at the grey sky outside. She had stopped speaking entirely since the attack yesterday. Sylvia's chest was braced for something awful, a crash she could see approaching in slow motion.
It had taken Virginia two years to find her voice after that fateful day—two years to speak to another person. And when she finally spoke, a weight was lifted from Sylvia, producing a joy she would never forget. But now, that was all over, again.`;

const initialSuggestions = [
  {
    id: uuidv4(),
    editType: "Line",
    original: '"Please speak to me,"',
    suggestion: '"Could you please speak to me?"',
    why: "Makes it more polite.",
    state: "pending" as const,
    start: 0,
    end: 19
  },
  {
    id: uuidv4(),
    editType: "Line",
    original: "It had taken Virginia two years",
    suggestion: "Virginia had taken two years",
    why: "Places agency with Virginia.",
    state: "pending" as const,
    start: 271,
    end: 300
  }
];

export default function SlatePage() {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" size="xl" mb={8} color="purple.700">
        Lulu Mentor App (Slate.js Version)
      </Heading>
      <SlateEditor
        initialValue={defaultText}
        initialSuggestions={initialSuggestions}
        onTextChange={(text) => console.log('Text changed:', text)}
        onSuggestionChange={(suggestions) => console.log('Suggestions changed:', suggestions)}
      />
    </Container>
  );
} 