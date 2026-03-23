'use client';

import { Flex, Text, DropdownMenu } from '@radix-ui/themes';
import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { PropertyItem } from './PropertyItem';
import styles from './PropertyItem.module.css';

interface PropertyItemTimestampProps {
  timestamp: Date;
  timezone?: string;
  onTimezoneChange?: (timezone: string) => void;
}

const TIMEZONES = [
  { label: 'UTC-8 (Pacific)', value: 'America/Los_Angeles' },
  { label: 'UTC-5 (Eastern)', value: 'America/New_York' },
  { label: 'UTC-4', value: 'America/New_York' },
  { label: 'UTC+0 (London)', value: 'Europe/London' },
  { label: 'UTC+1 (Berlin)', value: 'Europe/Berlin' },
  { label: 'UTC+9 (Tokyo)', value: 'Asia/Tokyo' },
];

function formatTimestamp(date: Date, timezone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  };
  return date.toLocaleString('en-US', options);
}

function getTimezoneOffset(timezone?: string): string {
  if (!timezone) return '';
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    return offsetPart?.value || '';
  } catch {
    return '';
  }
}

export function PropertyItemTimestamp({
  timestamp,
  timezone = 'America/New_York',
  onTimezoneChange,
}: PropertyItemTimestampProps) {
  const formattedTime = formatTimestamp(timestamp, timezone);
  const offset = getTimezoneOffset(timezone);

  return (
    <PropertyItem label="Timestamp">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Flex
            align="center"
            gap="1"
            className={styles.timestampValue}
            px="2"
          >
            <Text size="1" weight="medium">
              {formattedTime}
            </Text>
            {offset && (
              <Text size="1" color="gray">
                ({offset})
              </Text>
            )}
            <ChevronDownIcon className={styles.chevron} />
          </Flex>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {TIMEZONES.map((tz) => (
            <DropdownMenu.Item
              key={tz.value}
              onSelect={() => onTimezoneChange?.(tz.value)}
            >
              {tz.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </PropertyItem>
  );
}
