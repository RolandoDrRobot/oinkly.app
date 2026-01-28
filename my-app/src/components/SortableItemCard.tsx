import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';

interface SortableItemCardProps {
  id: string;
  index: number;
  children: (props: { dragAttributes: any; dragListeners: any; isDragging: boolean }) => React.ReactNode;
}

const SortableItemCard: React.FC<SortableItemCardProps> = ({ id, index, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 * index }}
        whileHover={{ y: -2 }}
        style={{
          position: 'relative',
        }}
      >
        {children({ dragAttributes: attributes, dragListeners: listeners, isDragging })}
      </motion.div>
    </div>
  );
};

export default SortableItemCard;
