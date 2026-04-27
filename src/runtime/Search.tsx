import {
  useState,
  useEffect,
  useCallback,
  Suspense,
  useRef,
  lazy,
} from 'react';
import type { SearchProps } from './RealSearch';

import 'typesense-docsearch-css';
import './Search.css';
import { useLang } from '@rspress/core/runtime';

const RealSearch = lazy(() => import('./RealSearch'));

export function Search(props: SearchProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const isLoadedRef = useRef(false);
  const triggerRef = useRef<'hover' | 'keyboard' | 'idle' | null>(null);

  const lang = useLang() || 'en';
  const placeholder = props.locales?.[lang]?.placeholder || 'Search';

  const loadSearch = useCallback((trigger: 'hover' | 'keyboard' | 'idle') => {
    if (!triggerRef.current) triggerRef.current = trigger;
    if (!isLoadedRef.current) {
      isLoadedRef.current = true;
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    //  Load when browser is idle
    let idleHandle: number | ReturnType<typeof setTimeout>;
    if ('requestIdleCallback' in window) {
      idleHandle = (window as any).requestIdleCallback(() =>
        loadSearch('idle'),
      );
    } else {
      idleHandle = setTimeout(() => loadSearch('idle'), 2000); // Safari fallback
    }

    // Load globally on shortcut commands
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't intercept if user is typing in form inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
        return;

      const isCmdK =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      const isSlash = event.key === '/';

      if (isCmdK || isSlash) {
        if (!isLoadedRef.current) {
          event.preventDefault(); // Stop native browser find or typing
          loadSearch('keyboard');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if ('requestIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleHandle);
      } else {
        clearTimeout(idleHandle as number);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loadSearch]);

  // Handle opening the real DocSearch modal automatically if invoked by keyboard
  useEffect(() => {
    if (isLoaded && triggerRef.current === 'keyboard') {
      const interval = setInterval(() => {
        const button = document.querySelector(
          '.DocSearch-Button:not(.DocSearch-Fake-Button)',
        );

        if (button) {
          (button as HTMLElement).click();
          clearInterval(interval);
          triggerRef.current = null;
        }
      }, 50); // Polling briefly checks when the Suspense block un-suspends

      const timeout = setTimeout(() => clearInterval(interval), 5000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isLoaded]);

  return (
    <>
      {isLoaded ? (
        <Suspense
          fallback={
            <FakeSearchButton
              placeholder={placeholder}
              onMouseEnter={() => loadSearch('hover')}
            />
          }
        >
          <RealSearch {...props} />
        </Suspense>
      ) : (
        <FakeSearchButton
          placeholder={placeholder}
          onClick={() => loadSearch('hover')}
          onMouseEnter={() => loadSearch('hover')}
        />
      )}
    </>
  );
}

function FakeSearchButton({
  onClick,
  onMouseEnter,
  placeholder = 'Search',
}: {
  onClick?: () => void;
  onMouseEnter?: () => void;
  placeholder: string;
}) {
  const [modifierKey, setModifierKey] = useState<string | null>(null);

  useEffect(() => {
    const isMac = /(Mac|iPhone|iPod|iPad)/i.test(
      typeof navigator !== 'undefined' ? navigator.platform : '',
    );
    setModifierKey(isMac ? '⌘' : 'Ctrl');
  }, []);

  return (
    <button
      type='button'
      className='DocSearch DocSearch-Button DocSearch-Fake-Button'
      aria-label='Search'
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <span className='DocSearch-Button-Container'>
        <svg
          width='20'
          height='20'
          className='DocSearch-Search-Icon'
          viewBox='0 0 20 20'
        >
          <path
            d='M14.386 14.386l4.0877 4.0877-4.0877-4.0877c-2.9418 2.9419-7.7115 2.9419-10.6533 0-2.9419-2.9418-2.9419-7.7115 0-10.6533 2.9418-2.9419 7.7115-2.9419 10.6533 0 2.9419 2.9418 2.9419 7.7115 0 10.6533z'
            stroke='currentColor'
            fill='none'
            fillRule='evenodd'
            strokeLinecap='round'
            strokeLinejoin='round'
          ></path>
        </svg>
        <span className='DocSearch-Button-Placeholder'>{placeholder}</span>
      </span>
      <span className='DocSearch-Button-Keys'>
        <kbd className='DocSearch-Button-Key'>{modifierKey}</kbd>
        <kbd className='DocSearch-Button-Key'>K</kbd>
      </span>
    </button>
  );
}

export type { SearchProps };
