const DISCORD_EPOCH = 1_420_070_400_000n;

export function isDiscordSnowflake(value: string): boolean {
  return /^\d{17,20}$/.test(value);
}

export function getDiscordSnowflakeCreatedAt(snowflake: string): Date {
  if (!isDiscordSnowflake(snowflake)) {
    throw new Error(`Invalid Discord snowflake: ${snowflake}`);
  }

  const milliseconds = (BigInt(snowflake) >> 22n) + DISCORD_EPOCH;
  return new Date(Number(milliseconds));
}
