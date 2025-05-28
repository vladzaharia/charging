'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Custom hook to track page visibility using the Page Visibility API
 * Returns true when the page is visible, false when hidden
 */
function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

interface PollingState<T> {
  data: T;
  error: Error | null;
  isPolling: boolean;
  retryCount: number;
}

interface PollingOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  pauseWhenHidden?: boolean;
  jitterRange?: number;
  adaptivePolling?: boolean;
  refetchOnFocus?: boolean;
  onError?: (error: Error, retryCount: number) => void;
  onSuccess?: (data: unknown) => void;
}

export function usePolling<T>(
  initialData: T,
  pollingFunction: () => Promise<T>,
  intervalMs: number = 30000, // Default to 30 seconds
  enabled: boolean = true,
  options: PollingOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    pauseWhenHidden = true,
    jitterRange = 0.1,
    adaptivePolling = false,
    refetchOnFocus = true,
    onError,
    onSuccess,
  } = options;

  // Enhanced retry delay calculation with jitter to prevent thundering herd
  const calculateRetryDelay = useCallback(
    (baseDelay: number, retryCount: number, exponentialBackoff: boolean, jitterRange: number) => {
      const delay = exponentialBackoff
        ? Math.min(baseDelay * Math.pow(2, retryCount), 30000)
        : baseDelay;

      if (jitterRange > 0) {
        const jitter = delay * jitterRange * (Math.random() * 2 - 1); // ±jitterRange%
        return Math.max(100, delay + jitter); // minimum 100ms
      }
      return delay;
    },
    []
  );

  // Track page visibility for intelligent polling
  const isVisible = usePageVisibility();

  const [state, setState] = useState<PollingState<T>>({
    data: initialData,
    error: null,
    isPolling: false,
    retryCount: 0,
  });

  // Adaptive polling state - use ref to avoid useEffect dependency issues
  const adaptiveIntervalRef = useRef(intervalMs);

  // Focus detection state for refetch on focus
  const [hasFocus, setHasFocus] = useState(() =>
    typeof window !== 'undefined' ? document.hasFocus() : true
  );

  // Use refs to avoid dependency issues with data change detection
  const lastDataHashRef = useRef<string>('');

  // Data change detection for adaptive polling
  const detectDataChange = useCallback(
    (newData: T) => {
      if (!adaptivePolling) return false;

      const dataHash = JSON.stringify(newData);
      if (dataHash !== lastDataHashRef.current) {
        lastDataHashRef.current = dataHash;
        return true;
      }
      return false;
    },
    [adaptivePolling]
  );

  // Adaptive interval adjustment based on data change frequency
  const updateAdaptiveInterval = useCallback(
    (hasChanged: boolean) => {
      if (!adaptivePolling) return;

      if (hasChanged) {
        // Data changed, decrease interval for responsiveness
        adaptiveIntervalRef.current = Math.max(15000, adaptiveIntervalRef.current * 0.8);
      } else {
        // Data stable, increase interval to reduce load
        adaptiveIntervalRef.current = Math.min(60000, adaptiveIntervalRef.current * 1.1);
      }
    },
    [adaptivePolling]
  );

  // Reset adaptive interval when polling is re-enabled or base interval changes
  useEffect(() => {
    if (adaptivePolling) {
      adaptiveIntervalRef.current = intervalMs;
    }
  }, [enabled, intervalMs, adaptivePolling]);

  // Focus event listeners for refetch on focus
  useEffect(() => {
    if (!refetchOnFocus) return;

    const handleFocus = () => setHasFocus(true);
    const handleBlur = () => setHasFocus(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [refetchOnFocus]);

  // Manual retry function
  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, retryCount: 0, error: null }));
    // Trigger a new poll by calling the polling function directly
    pollingFunctionRef.current().then(
      (newData) => {
        setState((prev) => ({
          ...prev,
          data: newData,
          error: null,
          isPolling: false,
          retryCount: 0,
        }));
        onSuccessRef.current?.(newData);
      },
      (error) => {
        const err = error instanceof Error ? error : new Error('Unknown polling error');
        setState((prev) => ({
          ...prev,
          error: err,
          isPolling: false,
        }));
        onErrorRef.current?.(err, 1);
        console.error('Error in manual retry:', err);
      }
    );
  }, []);

  // Use refs to store the latest functions to avoid dependency issues
  const pollingFunctionRef = useRef(pollingFunction);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  pollingFunctionRef.current = pollingFunction;
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  // Track previous visibility state to detect when tab becomes visible
  const prevIsVisible = useRef(isVisible);

  useEffect(() => {
    // Determine if polling should be active
    const shouldPoll = enabled && (pauseWhenHidden ? isVisible : true);

    if (!shouldPoll) return;

    let isSubscribed = true;

    // Create a stable polling function that uses the ref
    const stablePollData = async (isRetry: boolean = false) => {
      if (!isRetry) {
        setState((prev) => ({ ...prev, isPolling: true, error: null }));
      }

      try {
        const newData = await pollingFunctionRef.current();

        // Detect data changes and update adaptive interval
        const hasChanged = detectDataChange(newData);
        updateAdaptiveInterval(hasChanged);

        setState((prev) => ({
          ...prev,
          data: newData,
          error: null,
          isPolling: false,
          retryCount: 0,
        }));
        onSuccessRef.current?.(newData);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown polling error');

        let currentRetryCount = 0;
        setState((prev) => {
          const newRetryCount = prev.retryCount + 1;
          currentRetryCount = newRetryCount;

          // Handle retry logic inside setState to avoid stale closures
          if (newRetryCount <= maxRetries && isSubscribed) {
            const delay = calculateRetryDelay(
              retryDelay,
              prev.retryCount,
              exponentialBackoff,
              jitterRange
            );

            setTimeout(() => {
              if (isSubscribed && enabled) {
                stablePollData(true);
              }
            }, delay);
          }

          return {
            ...prev,
            error: err,
            isPolling: false,
            retryCount: newRetryCount,
          };
        });

        onErrorRef.current?.(err, currentRetryCount);
        console.error('Error polling data:', err);
      }
    };

    // Initial poll
    stablePollData();

    // Set up polling interval (use adaptive interval if enabled)
    const currentInterval = adaptivePolling ? adaptiveIntervalRef.current : intervalMs;
    const intervalId = setInterval(() => {
      if (isSubscribed && shouldPoll) {
        stablePollData();
      }
    }, currentInterval);

    // Clean up
    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [
    enabled,
    isVisible,
    pauseWhenHidden,
    intervalMs,
    adaptivePolling,
    maxRetries,
    retryDelay,
    exponentialBackoff,
    jitterRange,
    calculateRetryDelay,
    detectDataChange,
    updateAdaptiveInterval,
  ]);

  // Handle immediate polling when tab becomes visible
  useEffect(() => {
    if (pauseWhenHidden && isVisible && !prevIsVisible.current && enabled) {
      // Tab just became visible, trigger immediate poll
      pollingFunctionRef.current().then(
        (newData) => {
          // Detect data changes and update adaptive interval
          const hasChanged = detectDataChange(newData);
          updateAdaptiveInterval(hasChanged);

          setState((prev) => ({
            ...prev,
            data: newData,
            error: null,
            retryCount: 0,
          }));
          onSuccessRef.current?.(newData);
        },
        (error) => {
          const err = error instanceof Error ? error : new Error('Unknown polling error');
          setState((prev) => ({
            ...prev,
            error: err,
          }));
          onErrorRef.current?.(err, 0);
          console.error('Error in visibility refetch:', err);
        }
      );
    }
    prevIsVisible.current = isVisible;
  }, [isVisible, pauseWhenHidden, enabled, detectDataChange, updateAdaptiveInterval]);

  // Handle refetch on focus (avoid duplicate with visibility refetch)
  const prevHasFocus = useRef(hasFocus);
  useEffect(() => {
    if (refetchOnFocus && hasFocus && !prevHasFocus.current && enabled) {
      // Only refetch if visibility didn't already trigger a refetch
      // Check if visibility change happened in the same tick
      const shouldRefetch =
        !pauseWhenHidden || (pauseWhenHidden && isVisible && prevIsVisible.current);

      if (shouldRefetch) {
        // Window regained focus, trigger immediate refetch
        pollingFunctionRef.current().then(
          (newData) => {
            // Detect data changes and update adaptive interval
            const hasChanged = detectDataChange(newData);
            updateAdaptiveInterval(hasChanged);

            setState((prev) => ({
              ...prev,
              data: newData,
              error: null,
              retryCount: 0,
            }));
            onSuccessRef.current?.(newData);
          },
          (error) => {
            const err = error instanceof Error ? error : new Error('Unknown polling error');
            setState((prev) => ({
              ...prev,
              error: err,
            }));
            onErrorRef.current?.(err, 0);
            console.error('Error in focus refetch:', err);
          }
        );
      }
    }
    prevHasFocus.current = hasFocus;
  }, [
    hasFocus,
    refetchOnFocus,
    enabled,
    pauseWhenHidden,
    isVisible,
    detectDataChange,
    updateAdaptiveInterval,
  ]);

  return {
    ...state,
    retry,
  };
}
