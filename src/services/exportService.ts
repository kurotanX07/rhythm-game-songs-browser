// src/services/exportService.ts
import { Song } from '../types/Song';
import { Game } from '../types/Game';
import * as XLSX from 'xlsx';

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  includeDetailedInfo: boolean;
  filename?: string;
}

/**
 * Export songs to various file formats
 */
export async function exportSongData(
  songs: Song[], 
  game: Game | null, 
  options: ExportOptions
): Promise<void> {
  // Generate default filename if not provided
  const filename = options.filename || 
    `${game?.title || 'rhythm-game'}_songs_${new Date().toISOString().split('T')[0]}`;
  
  // Convert songs to the appropriate format
  switch (options.format) {
    case 'csv':
      exportToCsv(songs, game, filename, options.includeDetailedInfo);
      break;
    case 'xlsx':
      exportToExcel(songs, game, filename, options.includeDetailedInfo);
      break;
    case 'json':
      exportToJson(songs, game, filename, options.includeDetailedInfo);
      break;
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

/**
 * Convert songs to a row-based format for CSV/Excel export
 */
function songsToRows(songs: Song[], game: Game | null, includeDetailedInfo: boolean): Array<Array<string | number | Date | null | undefined>> {
  // Get all difficulties from the game, sorted by order
  const difficulties = game?.difficulties 
    ? [...game.difficulties].sort((a, b) => a.order - b.order) 
    : [];
  
  // Prepare headers based on the export options
  const baseHeaders = [
    'No.',
    '楽曲名',
    'アーティスト'
  ];
  
  const detailedHeaders = includeDetailedInfo 
    ? [
        '作詞',
        '作曲', 
        '編曲',
        'BPM',
        '時間',
        '追加日',
        'タグ'
      ] 
    : [];
  
  // Create difficulty headers for both level and combo
  const difficultyHeaders: string[] = [];
  difficulties.forEach(diff => {
    difficultyHeaders.push(`${diff.name} Lv`);
    difficultyHeaders.push(`${diff.name} コンボ`);
  });
  
  // Combine all headers
  const headers = [...baseHeaders, ...detailedHeaders, ...difficultyHeaders];
  
  // Create rows with headers as the first row
  const rows: Array<Array<string | number | Date | null | undefined>> = [headers];
  
  // Convert each song to a row
  songs.forEach(song => {
    const baseInfo = [
      song.songNo,
      song.name,
      song.info.artist || ''
    ];
    
    const detailedInfo = includeDetailedInfo 
      ? [
          song.info.lyricist || '',
          song.info.composer || '',
          song.info.arranger || '',
          song.info.bpm || '',
          song.info.duration || '',
          song.info.addedDate ? song.info.addedDate.toLocaleDateString() : '',
          song.info.tags ? song.info.tags.join(', ') : ''
        ] 
      : [];
    
    // Add difficulty information
    const difficultyInfo: Array<string | number | null | undefined> = [];
    difficulties.forEach(diff => {
      // Level
      difficultyInfo.push(song.difficulties[diff.id]?.level || '');
      // Combo
      difficultyInfo.push(song.difficulties[diff.id]?.combo || '');
    });
    
    // Combine all info into a single row
    const row = [...baseInfo, ...detailedInfo, ...difficultyInfo];
    rows.push(row);
  });
  
  return rows;
}

/**
 * Export songs to CSV format
 */
function exportToCsv(songs: Song[], game: Game | null, filename: string, includeDetailedInfo: boolean): void {
  // Convert songs to rows
  const rows = songsToRows(songs, game, includeDetailedInfo);
  
  // Convert rows to CSV
  const csvContent = rows.map(row => 
    row.map((value: string | number | Date | null | undefined) => {
      // Handle values that need to be quoted (contain commas, quotes, or newlines)
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        // Escape quotes by doubling them and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  ).join('\n');
  
  // Create a blob and trigger download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
}

/**
 * Export songs to Excel format
 */
function exportToExcel(songs: Song[], game: Game | null, filename: string, includeDetailedInfo: boolean): void {
  // Convert songs to rows
  const rows = songsToRows(songs, game, includeDetailedInfo);
  
  // Create a new workbook and add the rows
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  
  // Style the headers
  if (worksheet['!ref']) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      
      if (!worksheet[cellAddress].s) worksheet[cellAddress].s = {};
      worksheet[cellAddress].s.font = { bold: true };
      worksheet[cellAddress].s.fill = { fgColor: { rgb: "EFEFEF" } };
    }
  }
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Songs');
  
  // Generate the Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Trigger download
  triggerDownload(blob, `${filename}.xlsx`);
}

/**
 * Export songs to JSON format
 */
function exportToJson(songs: Song[], game: Game | null, filename: string, includeDetailedInfo: boolean): void {
  // Create export data structure
  const exportData = {
    game: game ? {
      id: game.id,
      title: game.title,
      description: game.description,
      difficulties: game.difficulties
    } : null,
    exportDate: new Date().toISOString(),
    songCount: songs.length,
    songs: includeDetailedInfo 
      ? songs 
      : songs.map(song => ({
          id: song.id,
          gameId: song.gameId,
          songNo: song.songNo,
          name: song.name,
          difficulties: song.difficulties,
          info: {
            artist: song.info.artist
          }
        }))
  };
  
  // Convert to JSON and create blob
  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  
  // Trigger download
  triggerDownload(blob, `${filename}.json`);
}

/**
 * Helper function to trigger a file download
 */
function triggerDownload(blob: Blob, filename: string): void {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a link element and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}