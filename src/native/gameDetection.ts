import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec)

//Simple detect list
const KNOWN_GAMES: Record<string, string> = {
  'steam.exe': 'Steam',
  'discord.exe': 'Discord',
  'code': 'VS Code (replace with actual game later)'
  // Add more later
};

export async function detectRunningGame(): Promise<string | null> {
  try{
    //For linux
    const { stdout } = await execAsync('ps aux');
    const lowerOutput = stdout.toLowerCase();

    for (const [processName, gameName] of Object.entries(KNOWN_GAMES)) {
      if (lowerOutput.includes(processName.toLowerCase())) {
        return gameName;
      }
    }

    return null;
  } catch (error) {
    console.error('Error deteching game:', error);
    return null;
  }
}