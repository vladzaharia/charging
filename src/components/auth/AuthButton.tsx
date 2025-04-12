import { useState } from 'react';
import { Auth } from './Auth';
import { ButtonReact } from '../button/ButtonReact';

export const AuthButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <ButtonReact onClick={() => setIsOpen(true)} variant="primary">
        Sign In
      </ButtonReact>
      <Auth isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
