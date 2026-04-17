import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { HeightRuler } from '../HeightRuler';
import { resolveTheme, type BodyMetricsPickerTheme } from '../../theme';
import type { HeightUnit } from '../../types';

/** Props passed to the `renderConfirmButton` render prop */
export interface RenderConfirmButtonProps {
  onPress: () => void;
  label: string;
}

export interface HeightPickerProps {
  // ── Sheet state ────────────────────────────────────────────────────
  /** Whether the bottom sheet is open */
  isOpen: boolean;
  /** Called when the sheet dismisses (any reason) */
  onClose: () => void;
  /** Current height value in the current `unit` */
  value: number;
  /** Called with the selected value string when user confirms */
  onConfirm: (value: string, unit: HeightUnit) => void;

  // ── Simple content props ───────────────────────────────────────────
  /** Sheet title */
  title?: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Current unit (default 'cm') */
  unit?: HeightUnit;
  /** Called when the user taps the cm/ft switcher. When provided, the switcher is shown. */
  onUnitChange?: (unit: HeightUnit) => void;
  /** Override min value (defaults derived from unit) */
  min?: number;
  /** Override max value (defaults derived from unit) */
  max?: number;
  /** Format tick labels */
  formatTickLabel?: (value: number) => string;
  /** Called on scroll begin (e.g. for haptics) */
  onScrollBegin?: () => void;
  /** Called on scroll end */
  onScrollEnd?: () => void;

  // ── Close button (simple) ──────────────────────────────────────────
  /** Whether to render a close button in the header. Default: true. */
  showCloseButton?: boolean;
  /**
   * Replace the default "✕" glyph with a custom node (e.g. Ionicons,
   * SVG, image). The wrapping touchable & positioning stay default.
   */
  closeIcon?: ReactNode;

  // ── Advanced render prop (one, by design) ──────────────────────────
  /**
   * Fully replace the confirm button. Call `onPress` to commit the
   * selection (the sheet will dismiss automatically).
   */
  renderConfirmButton?: (props: RenderConfirmButtonProps) => ReactNode;

  // ── Theme ──────────────────────────────────────────────────────────
  /** Partial theme override */
  theme?: BodyMetricsPickerTheme;
  /** Backdrop opacity (0-1). Default: 0.45 */
  backdropOpacity?: number;
}

export function HeightPicker({
  isOpen,
  onClose,
  value,
  onConfirm,
  title = 'Select Height',
  confirmLabel = 'Confirm',
  unit = 'cm',
  onUnitChange,
  min,
  max,
  formatTickLabel,
  onScrollBegin,
  onScrollEnd,
  showCloseButton = true,
  closeIcon,
  renderConfirmButton,
  theme,
  backdropOpacity = 0.45,
}: HeightPickerProps) {
  const t = useMemo(() => resolveTheme(theme), [theme]);

  /**
   * The picker owns an internal "session" state that tracks the value
   * and unit currently displayed by the ruler. The `value`/`unit`
   * props seed it each time the sheet opens — after that the ruler
   * drives changes (including cm/ft conversions on unit switch),
   * which would otherwise crash if we passed stale props back down.
   */
  const [activeUnit, setActiveUnit] = useState<HeightUnit>(unit);
  const [displayValue, setDisplayValue] = useState<number>(value);

  const fractionDigits = activeUnit === 'ft' ? 1 : 0;
  const selectedRef = useRef(displayValue.toFixed(fractionDigits));
  const sheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (isOpen) {
      // Seed/reset session state from props whenever the sheet opens
      setActiveUnit(unit);
      setDisplayValue(value);
      selectedRef.current = value.toFixed(unit === 'ft' ? 1 : 0);
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleValueChange = useCallback((v: string) => {
    selectedRef.current = v;
    setDisplayValue(Number(v));
  }, []);

  const handleUnitChange = useCallback(
    (newUnit: HeightUnit) => {
      setActiveUnit(newUnit);
      onUnitChange?.(newUnit);
    },
    [onUnitChange],
  );

  const dismiss = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(selectedRef.current, activeUnit);
    sheetRef.current?.dismiss();
  }, [onConfirm, activeUnit]);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={backdropOpacity}
        pressBehavior="close"
        style={[props.style, { backgroundColor: t.colors.backdrop }]}
      />
    ),
    [backdropOpacity, t.colors.backdrop],
  );

  const fontFamily = t.typography.fontFamily || undefined;

  return (
    <BottomSheetModal
      ref={sheetRef}
      enablePanDownToClose
      onDismiss={handleDismiss}
      enableDynamicSizing
      backgroundStyle={{
        backgroundColor: t.colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      handleIndicatorStyle={{ backgroundColor: t.colors.handleIndicator, width: 36 }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              { color: t.colors.title, fontSize: t.typography.titleSize, fontFamily },
            ]}
          >
            {title}
          </Text>
          {showCloseButton && (
            <TouchableOpacity
              onPress={dismiss}
              style={[styles.closeButton, { backgroundColor: t.colors.closeBackground }]}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {closeIcon ?? (
                <Text style={[styles.closeText, { color: t.colors.closeIcon, fontFamily }]}>✕</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <HeightRuler
          unit={activeUnit}
          onUnitChange={handleUnitChange}
          initialValue={displayValue}
          min={min}
          max={max}
          formatTickLabel={formatTickLabel}
          onValueChange={handleValueChange}
          onScrollBegin={onScrollBegin}
          onScrollEnd={onScrollEnd}
          theme={theme}
        />

        {renderConfirmButton ? (
          renderConfirmButton({ onPress: handleConfirm, label: confirmLabel })
        ) : (
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: t.colors.confirmButtonBackground }]}
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.confirmText,
                {
                  color: t.colors.confirmButtonText,
                  fontSize: t.typography.confirmButtonSize,
                  fontFamily,
                },
              ]}
            >
              {confirmLabel}
            </Text>
          </TouchableOpacity>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  confirmText: {
    fontWeight: '700',
  },
});
