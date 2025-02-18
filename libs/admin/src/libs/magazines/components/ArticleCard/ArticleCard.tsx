import { Card, Group, Image, Text } from '@mantine/core';
import classes from './ArticleCard.module.css';

type ArticleCardProps = {
  thumbnailImageUri?: string;
  category?: string;
  title: string;
  description?: string;
  author?: string;
  date?: Date;
};

export const ArticleCard = ({ thumbnailImageUri, category, title, date, author, description }: ArticleCardProps) => {
  return (
    <Card withBorder radius="md" p={0} className={classes.card}>
      <Group wrap="nowrap" gap={0}>
        {thumbnailImageUri && <Image src={thumbnailImageUri} height={144} />}
        <div className={classes.body}>
          {category && (
            <Text tt="uppercase" c="dimmed" fw={700} size="xs">
              {category}
            </Text>
          )}
          <Text className={classes.title} mt="xs" mb={'xs'}>
            {title}
          </Text>
          <Text className={classes.desc} mb="md">
            {description}
          </Text>
          <Group wrap="nowrap" gap="xs">
            <Group gap="xs" wrap="nowrap">
              <Text size="xs">{author}</Text>
            </Group>
            <Text size="xs" c="dimmed">
              •
            </Text>
            <Text size="xs" c="dimmed">
              {date?.toLocaleDateString()}
            </Text>
          </Group>
        </div>
      </Group>
    </Card>
  );
};
