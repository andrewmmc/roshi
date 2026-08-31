import * as React from 'react';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        className={cn('pr-8', className)}
        {...props}
      />
      <IconButton
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 -translate-y-1/2"
        tooltip={visible ? t('common.hidePassword') : t('common.showPassword')}
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
      </IconButton>
    </div>
  );
}

export { PasswordInput };
