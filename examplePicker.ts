import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import CloseButton from '@/components/common/CloseButton/CloseButton';
import RulerPicker from '@/components/common/RulerPicker/RulerPicker';
import { BottomSheet, BottomSheetContent, BottomSheetPortal } from '@/components/ui/bottomsheet';
import { Button, ButtonText } from '@/components/ui/button-v2';
import { Text } from '@/components/ui/text-v2';
import { theme } from '@/styles/theme';
import { HeightUnitT } from '@/types/common/Unit';

const METRIC_CONFIG = {
  min: 50,
  max: 250,
  step: 1,
  fractionDigits: 0,
  unit: 'cm',
  longStepInterval: 5,
} as const;
const IMPERIAL_CONFIG = {
  min: 1.6,
  max: 8.2,
  step: 0.1,
  fractionDigits: 1,
  unit: 'ft',
  longStepInterval: 10,
} as const;

type HeightPickerSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  sheetKey: number;
  value: number;
  onConfirm: (value: string) => void;
  title: string;
  confirmLabel: string;
  unit: HeightUnitT;
  min?: number;
  max?: number;
};

const HeightPickerSheet = ({
  isOpen,
  onClose,
  sheetKey,
  value,
  onConfirm,
  title,
  confirmLabel,
  unit,
  min,
  max,
}: HeightPickerSheetProps) => {
  const defaults = unit === 'cm' ? METRIC_CONFIG : IMPERIAL_CONFIG;
  const config = {
    ...defaults,
    min: min ?? defaults.min,
    max: max ?? defaults.max,
  };
  const clampedInitial = Math.min(config.max, Math.max(config.min, value || config.min));
  const selectedRef = useRef(clampedInitial.toFixed(config.fractionDigits));
  const { bottom } = useSafeAreaInsets();

  const handleValueChange = (v: string) => {
    selectedRef.current = v;
  };

  const handleConfirm = () => {
    onConfirm(selectedRef.current);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} snapToIndex={0}>
      <BottomSheetPortal onClose={onClose}>
        <BottomSheetContent style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <CloseButton onPress={onClose} />
          </View>

          <RulerPicker
            key={sheetKey}
            min={config.min}
            max={config.max}
            step={config.step}
            initialValue={clampedInitial}
            fractionDigits={config.fractionDigits}
            unit={config.unit}
            longStepInterval={config.longStepInterval}
            formatTickLabel={unit === 'ft' ? (v: number) => v.toFixed(1) : undefined}
            onValueChange={handleValueChange}
            horizontalInset={theme.spacing(8)}
          />

          <View style={styles.buttonWrap}>
            <Button onPress={handleConfirm} className="w-full">
              <ButtonText>{confirmLabel}</ButtonText>
            </Button>
          </View>
        </BottomSheetContent>
      </BottomSheetPortal>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    backgroundColor: theme.colors.background.light,
    paddingHorizontal: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
  },
  title: {
    fontFamily: 'Lato_700Bold',
    fontSize: theme.fontSize['2xl'],
    color: theme.colors.typography.black,
  },
  buttonWrap: {
    marginTop: theme.spacing(6),
  },
});

export default HeightPickerSheet;
