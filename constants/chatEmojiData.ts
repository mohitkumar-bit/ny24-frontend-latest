export type EmojiEntry = {
  emoji: string;
  keywords: string[];
};

const mk = (
  emojis: string[],
  shared: string[],
  specific: Record<string, string[]> = {}
): EmojiEntry[] =>
  emojis.map((emoji) => ({
    emoji,
    keywords: [...shared, ...(specific[emoji] || [])],
  }));

export const EMOJI_ENTRIES: EmojiEntry[] = [
  ...mk(
    [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
      '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐',
      '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦',
      '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
      '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿',
      '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖',
    ],
    ['smile', 'face', 'emotion', 'mood'],
    {
      '😀': ['grin', 'happy'],
      '😃': ['happy', 'joy'],
      '😂': ['laugh', 'lol', 'joy'],
      '🤣': ['rofl', 'laugh'],
      '😍': ['love', 'heart eyes'],
      '😘': ['kiss', 'love'],
      '😭': ['cry', 'sad', 'tears'],
      '😢': ['cry', 'sad', 'tear'],
      '😡': ['angry', 'mad'],
      '🤬': ['swear', 'angry'],
      '😎': ['cool', 'sunglasses'],
      '🥳': ['party', 'celebrate'],
      '🤔': ['think', 'hmm'],
      '😴': ['sleep', 'tired'],
      '🤮': ['sick', 'vomit'],
      '🤡': ['clown'],
      '👻': ['ghost', 'halloween'],
      '👽': ['alien', 'ufo'],
      '🤖': ['robot'],
    }
  ),
  ...mk(
    [
      '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘',
      '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚',
      '🖐️', '🖖', '👋', '🤙', '💪', '🙏', '✍️', '💅', '🤳', '💋',
    ],
    ['hand', 'gesture'],
    {
      '👍': ['thumbs up', 'like', 'ok', 'yes'],
      '👎': ['thumbs down', 'dislike', 'no'],
      '👋': ['wave', 'hello', 'hi', 'bye'],
      '🙏': ['pray', 'thanks', 'please', 'namaste'],
      '💪': ['strong', 'muscle', 'flex'],
      '✌️': ['peace', 'victory'],
      '👌': ['ok', 'perfect'],
      '💋': ['kiss', 'lips'],
      '🤳': ['selfie'],
    }
  ),
  ...mk(
    [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
    ],
    ['heart', 'love'],
    {
      '💔': ['broken', 'sad'],
      '☮️': ['peace'],
    }
  ),
  ...mk(
    [
      '✨', '⭐', '🌟', '💫', '🔥', '💥', '💯', '✅', '❌', '⚠️',
      '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀',
    ],
    ['symbol', 'icon'],
    {
      '✨': ['sparkle', 'shine', 'magic'],
      '🔥': ['fire', 'hot', 'lit'],
      '💯': ['hundred', 'perfect'],
      '✅': ['check', 'done', 'yes'],
      '❌': ['cross', 'no', 'wrong'],
      '⚠️': ['warning', 'alert'],
      '🎉': ['party', 'celebrate', 'tada'],
      '🎁': ['gift', 'present'],
      '🏆': ['trophy', 'win'],
      '⚽': ['football', 'soccer', 'ball'],
      '🏀': ['basketball', 'ball'],
    }
  ),
  ...mk(
    [
      '🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🍰', '🎂', '🍩', '☕',
      '🍺', '🍻', '🥂', '🍷', '🥤', '🧃', '🍎', '🍇', '🍉', '🍓',
    ],
    ['food', 'drink', 'eat'],
    {
      '🍕': ['pizza'],
      '🍔': ['burger'],
      '🍟': ['fries'],
      '🌭': ['hotdog'],
      '🍿': ['popcorn'],
      '🧁': ['cupcake'],
      '🍰': ['cake', 'dessert'],
      '🎂': ['birthday', 'cake'],
      '🍩': ['donut'],
      '☕': ['coffee', 'tea'],
      '🍺': ['beer'],
      '🍻': ['cheers', 'beer'],
      '🥂': ['champagne', 'toast'],
      '🍷': ['wine'],
      '🥤': ['soda', 'drink'],
      '🍎': ['apple', 'fruit'],
      '🍇': ['grape', 'fruit'],
      '🍉': ['watermelon', 'fruit'],
      '🍓': ['strawberry', 'fruit'],
    }
  ),
  ...mk(
    [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦋', '🌸',
      '🌹', '🌻', '🌼', '🌷', '🌱', '🌲', '🌴', '🌈', '☀️', '🌙',
    ],
    ['nature', 'plant'],
    {
      '🐶': ['dog', 'puppy', 'pet', 'animal'],
      '🐱': ['cat', 'kitten', 'pet', 'animal'],
      '🐭': ['mouse', 'animal'],
      '🐹': ['hamster', 'animal'],
      '🐰': ['rabbit', 'bunny', 'animal'],
      '🦊': ['fox', 'animal'],
      '🐻': ['bear', 'animal'],
      '🐼': ['panda', 'animal'],
      '🐨': ['koala', 'animal'],
      '🐯': ['tiger', 'animal'],
      '🦁': ['lion', 'animal'],
      '🐮': ['cow', 'animal'],
      '🐷': ['pig', 'animal'],
      '🐸': ['frog', 'animal'],
      '🐵': ['monkey', 'animal'],
      '🐔': ['chicken', 'animal'],
      '🐧': ['penguin', 'animal'],
      '🐦': ['bird', 'animal'],
      '🦋': ['butterfly', 'insect'],
      '🌸': ['flower', 'blossom'],
      '🌹': ['rose', 'flower'],
      '🌻': ['sunflower', 'flower'],
      '🌼': ['blossom', 'flower'],
      '🌷': ['tulip', 'flower'],
      '🌱': ['seedling', 'grow'],
      '🌲': ['tree', 'forest'],
      '🌴': ['palm', 'tree', 'beach'],
      '🌈': ['rainbow'],
      '☀️': ['sun', 'sunny', 'day'],
      '🌙': ['moon', 'night'],
    }
  ),
];

export const ALL_EMOJIS = EMOJI_ENTRIES.map((entry) => entry.emoji);

export const filterEmojis = (query: string): EmojiEntry[] => {
  const q = query.trim().toLowerCase();
  if (!q) return EMOJI_ENTRIES;
  return EMOJI_ENTRIES.filter(
    (entry) =>
      entry.emoji.includes(q) ||
      entry.keywords.some((keyword) => keyword.toLowerCase().includes(q))
  );
};
