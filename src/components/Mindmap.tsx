import React, { useEffect, useRef } from 'react';
import * as markmap from 'markmap-view';
import { Transformer } from 'markmap-lib';

interface MindmapProps {
  content: string;
  className?: string;
}

export function Mindmap({ content, className = '' }: MindmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<any>(null);
  const transformerRef = useRef(new Transformer());

  useEffect(() => {
    if (svgRef.current && !mmRef.current) {
      mmRef.current = markmap.Markmap.create(svgRef.current);
    }
  }, []);

  useEffect(() => {
    if (mmRef.current && content) {
      try {
        const { root } = transformerRef.current.transform(content);
        mmRef.current.setData(root);
        mmRef.current.fit();
      } catch (error) {
        console.error('Error rendering mindmap:', error);
      }
    }
  }, [content]);

  return (
    <div className={`relative w-full ${className}`}>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}