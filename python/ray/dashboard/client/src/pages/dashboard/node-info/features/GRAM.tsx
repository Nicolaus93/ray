import { Box, Tooltip, Typography } from "@material-ui/core";
import React from "react";
import { GPUStats } from "../../../../api";
import { RightPaddedTypography } from "../../../../common/CustomTypography";
import { MiBRatioNoPercent } from "../../../../common/formatUtils";
import UsageBar from "../../../../common/UsageBar";
import { getWeightedAverage, sum } from "../../../../common/util";
import {
  ClusterFeatureComponent,
  Node,
  NodeFeatureComponent,
  WorkerFeatureComponent,
} from "./types";

const GRAM_COL_WIDTH = 120;

const nodeGRAMUtilization = (node: Node) => {
  const utilization = (gpu: GPUStats) => gpu.memory_used / gpu.memory_total;
  if (node.gpus.length === 0) {
    return NaN;
  }
  const utilizationSum = sum(node.gpus.map((gpu) => utilization(gpu)));
  const avgUtilization = utilizationSum / node.gpus.length;
  // Convert to a percent before returning
  return avgUtilization * 100;
};

const clusterGRAMUtilization = (nodes: Array<Node>) => {
  const utils = nodes
    .map((node) => ({
      weight: node.gpus.length,
      value: nodeGRAMUtilization(node),
    }))
    .filter((util) => !isNaN(util.value));
  if (utils.length === 0) {
    return NaN;
  }
  return getWeightedAverage(utils);
};

export const ClusterGRAM: ClusterFeatureComponent = ({ nodes }) => {
  const clusterAverageUtilization = clusterGRAMUtilization(nodes);
  return (
    <div style={{ minWidth: 60 }}>
      {isNaN(clusterAverageUtilization) ? (
        <Typography color="textSecondary" component="span" variant="inherit">
          N/A
        </Typography>
      ) : (
        <UsageBar
          percent={clusterAverageUtilization}
          text={`${clusterAverageUtilization.toFixed(1)}%`}
        />
      )}
    </div>
  );
};

export const NodeGRAM: NodeFeatureComponent = ({ node }) => {
  const nodeGRAMEntries = node.gpus.map((gpu, i) => {
    const props = {
      gpuName: gpu.name,
      utilization: gpu.memory_used,
      total: gpu.memory_total,
      slot: i,
    };
    return <GRAMEntry {...props} />;
  });
  return (
    <div style={{ minWidth: 60 }}>
      {nodeGRAMEntries.length === 0 ? (
        <Typography color="textSecondary" component="span" variant="inherit">
          N/A
        </Typography>
      ) : (
        <div style={{ minWidth: GRAM_COL_WIDTH }}>{nodeGRAMEntries}</div>
      )}
    </div>
  );
};

type GRAMEntryProps = {
  gpuName: string;
  slot: number;
  utilization: number;
  total: number;
};

const GRAMEntry: React.FC<GRAMEntryProps> = ({
  gpuName,
  slot,
  utilization,
  total,
}) => {
  const ratioStr = MiBRatioNoPercent(utilization, total);
  return (
    <Box display="flex" style={{ minWidth: GRAM_COL_WIDTH }}>
      <Tooltip title={gpuName}>
        <RightPaddedTypography variant="body1">
          [{slot}]: {ratioStr}
        </RightPaddedTypography>
      </Tooltip>
    </Box>
  );
};

export const WorkerGRAM: WorkerFeatureComponent = ({ worker, node }) => {
  const workerGRAMEntries = node.gpus
    .map((gpu, i) => {
      const process = gpu.processes.find(
        (process) => process.pid === worker.pid,
      );
      if (!process) {
        return undefined;
      }
      const props = {
        gpuName: gpu.name,
        total: gpu.memory_total,
        utilization: process.gpu_memory_usage,
        slot: i,
      };
      return <GRAMEntry {...props} />;
    })
    .filter((entry) => entry !== undefined);

  return workerGRAMEntries.length === 0 ? (
    <Typography color="textSecondary" component="span" variant="inherit">
      N/A
    </Typography>
  ) : (
    <div style={{ minWidth: GRAM_COL_WIDTH }}>{workerGRAMEntries}</div>
  );
};
