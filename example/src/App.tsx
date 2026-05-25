import { useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  SlotCounter,
  type SlotCounterHandle,
  type DigitImageTuple,
} from 'react-native-slot-counter';

const DIGITS: DigitImageTuple = [
  require('./assets/digits/0.png'),
  require('./assets/digits/1.png'),
  require('./assets/digits/2.png'),
  require('./assets/digits/3.png'),
  require('./assets/digits/4.png'),
  require('./assets/digits/5.png'),
  require('./assets/digits/6.png'),
  require('./assets/digits/7.png'),
  require('./assets/digits/8.png'),
  require('./assets/digits/9.png'),
];
const COMMA = require('./assets/digits/comma.png');
const DOT = require('./assets/digits/dot.png');

type CardConfig = {
  id: string;
  title: string;
  dark?: boolean;
  render: (ref: (h: SlotCounterHandle | null) => void) => React.ReactNode;
};

const CARDS: CardConfig[] = [
  {
    id: 'image',
    title: '1. Image renderer (custom digits)',
    dark: true,
    render: (ref) => (
      <SlotCounter
        ref={ref}
        renderer="image"
        initialValue={9876}
        width={320}
        height={88}
        digits={6}
        rollStyle="spin"
        digitImages={DIGITS}
        thousandsSeparatorImage={COMMA}
        decimalSeparatorImage={DOT}
        digitSlot={{ paddingX: 2, paddingY: 2 }}
        containerStyle={{
          backgroundColor: '#0d0d0d',
          borderRadius: 10,
          paddingX: 10,
          paddingY: 10,
        }}
        digitGap={2}
      />
    ),
  },
  {
    id: 'classic',
    title: '2. Classic spin (text)',
    render: (ref) => (
      <SlotCounter
        ref={ref}
        initialValue={1234}
        width={320}
        height={72}
        digits={7}
        fontSize={50}
        color="#111"
        thousandsSeparator=","
        rollStyle="spin"
        digitSlot={{
          backgroundColor: '#f3f3f3',
          borderColor: '#ddd',
          borderWidth: 1,
          borderRadius: 6,
          paddingX: 6,
          paddingY: 4,
        }}
        digitGap={4}
        groupGap={6}
      />
    ),
  },
  {
    id: 'mechanical',
    title: '3. Mechanical roll (continuous)',
    render: (ref) => (
      <SlotCounter
        ref={ref}
        initialValue={8400}
        width={320}
        height={72}
        digits={7}
        fontSize={50}
        color="#0a3d62"
        thousandsSeparator=" "
        rollStyle="mechanical"
        motion={{ type: 'spring', mass: 1, stiffness: 90, damping: 18 }}
        digitSlot={{ paddingX: 4 }}
        digitGap={2}
      />
    ),
  },
  {
    id: 'digital',
    title: '4. Digital flip (drop-in)',
    render: (ref) => (
      <SlotCounter
        ref={ref}
        initialValue={42}
        width={320}
        height={72}
        digits={6}
        fontSize={50}
        color="#222"
        rollStyle="digital"
        digitSlot={{
          backgroundColor: '#fff',
          borderColor: '#888',
          borderWidth: 1,
          borderRadius: 4,
          paddingX: 6,
          paddingY: 4,
        }}
        digitGap={3}
      />
    ),
  },
  {
    id: 'rolldown',
    title: '5. Roll-down direction',
    render: (ref) => (
      <SlotCounter
        ref={ref}
        initialValue={555}
        width={320}
        height={72}
        digits={6}
        fontSize={50}
        color="#5b2a86"
        rollStyle="mechanical"
        direction="down"
        digitSlot={{
          backgroundColor: '#f0e6ff',
          borderRadius: 6,
          paddingX: 6,
          paddingY: 4,
        }}
        digitGap={3}
      />
    ),
  },
  {
    id: 'casino',
    title: '6. Casino style (dark + gold)',
    dark: true,
    render: (ref) => (
      <SlotCounter
        ref={ref}
        initialValue={123456}
        width={320}
        height={84}
        digits={7}
        fontSize={56}
        fontWeight="bold"
        color="#ffd25a"
        thousandsSeparator=","
        separatorColor="#ffd25a"
        rollStyle="spin"
        digitSlot={{
          backgroundColor: '#1a1a1a',
          borderColor: '#ffd25a',
          borderWidth: 1.5,
          borderRadius: 8,
          paddingX: 8,
          paddingY: 6,
        }}
        containerStyle={{
          backgroundColor: '#000',
          borderRadius: 10,
          paddingX: 10,
          paddingY: 10,
        }}
        digitGap={4}
        groupGap={8}
      />
    ),
  },
  {
    id: 'decimals',
    title: '7. With decimals (price tag)',
    render: (ref) => (
      <SlotCounter
        ref={ref}
        initialValue={1299.99}
        width={320}
        height={72}
        digits={5}
        decimals={2}
        fontSize={46}
        color="#0a8a3a"
        thousandsSeparator=","
        decimalSeparator="."
        rollStyle="spin"
        digitSlot={{
          backgroundColor: '#eaf7ee',
          borderRadius: 5,
          paddingX: 5,
          paddingY: 4,
        }}
        digitGap={3}
      />
    ),
  },
];

export default function App() {
  const counters = useRef<Map<string, SlotCounterHandle>>(new Map());

  const setRef = (id: string) => (h: SlotCounterHandle | null) => {
    if (h) counters.current.set(id, h);
    else counters.current.delete(id);
  };

  const drive = (fn: (h: SlotCounterHandle) => void) => () => {
    counters.current.forEach((h) => fn(h));
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>react-native-slot-counter</Text>
        <Text style={styles.sub}>Slot counter variants</Text>
        {CARDS.map((item) => (
          <Card key={item.id} title={item.title} dark={item.dark}>
            {item.render(setRef(item.id))}
          </Card>
        ))}
      </ScrollView>

      <View style={styles.controlBar}>
        <Btn label="+250" onPress={drive((h) => h.addDelta(250))} />
        <Btn label="+5,000" onPress={drive((h) => h.addDelta(5000))} />
        <Btn
          label="Random"
          onPress={drive((h) =>
            h.setTarget(Math.floor(Math.random() * 1_000_000))
          )}
        />
        <Btn label="Reset" onPress={drive((h) => h.jumpTo(0))} />
      </View>
    </View>
  );
}

function Card({
  title,
  dark,
  children,
}: {
  title: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, dark && styles.cardDark]}>
      <Text style={[styles.cardTitle, dark && styles.cardTitleDark]}>
        {title}
      </Text>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      onPress={onPress}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f7' },
  scroll: { padding: 16, paddingTop: 56, paddingBottom: 16, gap: 12 },
  h1: { fontSize: 22, fontWeight: '700', color: '#111', textAlign: 'center' },
  sub: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardDark: { backgroundColor: '#161616' },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  cardTitleDark: { color: '#aaa' },
  cardBody: { alignItems: 'center' },
  controlBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  btnPressed: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '600' },
});
