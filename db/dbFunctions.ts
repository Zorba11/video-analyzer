import { supabase } from './supabaseConfig';

export async function insertRow(tableName: string, data: any) {
  try {
    const { data: insertedData, error } = await supabase
      .from(tableName)
      .insert([data]);

    if (error) {
      console.error('Failed to insert data:', error);
      return;
    }

    console.log('Inserted data:', insertedData);
  } catch (error) {
    console.error('Failed to insert data:', error);
  }
}
