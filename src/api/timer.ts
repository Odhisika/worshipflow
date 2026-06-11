import { invoke } from '@tauri-apps/api/core';

export interface TimerState {
  activity_id: string;
  activity_name: string;
  duration_seconds: number;
  elapsed_seconds: number;
  is_running: boolean;
  is_overrun: boolean;
}

export interface TimerInfo {
  current_timer: TimerState | null;
  upcoming_count: number;
  completed_count: number;
  total_elapsed: number;
  total_remaining: number;
}

export const timerApi = {
  loadService: (serviceId: string): Promise<TimerInfo> =>
    invoke('load_service_to_timer', { serviceId }),
  
  startNext: (): Promise<TimerInfo> =>
    invoke('start_next_activity'),
  
  pause: (): Promise<TimerInfo> =>
    invoke('pause_timer'),
  
  resume: (): Promise<TimerInfo> =>
    invoke('resume_timer'),
  
  addTime: (seconds: number): Promise<TimerInfo> =>
    invoke('add_timer_time', { seconds }),
  
  stop: (): Promise<TimerInfo> =>
    invoke('stop_timer'),
  
  getState: (): Promise<TimerInfo> =>
    invoke('get_timer_state'),
  
  clear: (): Promise<TimerInfo> =>
    invoke('clear_timer'),

  setActivity: (activityId: string): Promise<TimerInfo> =>
    invoke('set_timer_activity', { activityId }),
    
  startActivity: (): Promise<TimerInfo> =>
    invoke('start_current_timer_activity')
};
