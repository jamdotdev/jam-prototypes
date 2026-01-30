import { Flex } from '@radix-ui/themes';
import { SharePageLayout } from '@/components/SharePageLayout/SharePageLayout';

export default function Home() {
  return (
    <SharePageLayout>
      {/* Main content placeholder */}
      <Flex
        direction="column"
        align="center"
        justify="center"
        height="100%"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <p>Jam content goes here</p>
      </Flex>
    </SharePageLayout>
  );
}
