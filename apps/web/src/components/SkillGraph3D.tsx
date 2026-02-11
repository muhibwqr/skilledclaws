"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Skill } from "@/lib/api";

interface SkillNode {
  id: string;
  skill: Skill;
  position: THREE.Vector3;
  color: THREE.Color;
}

interface Edge {
  from: string;
  to: string;
  similarity: number;
}

interface SkillGraph3DProps {
  nodes: SkillNode[];
  edges?: Edge[];
  onNodeClick?: (skillId: string) => void;
  onNodeHover?: (skillId: string | null) => void;
}

export function SkillGraph3D({ nodes, edges = [], onNodeClick, onNodeHover }: SkillGraph3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const edgesRef = useRef<THREE.LineSegments | null>(null);
  const hoveredNodeRef = useRef<number>(-1);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const animationIdRef = useRef<number | null>(null);

  // Initialize scene, camera, renderer (only once)
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 50, 200);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 50);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 100;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Point light
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(50, 50, 50);
    scene.add(pointLight);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
      }
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update nodes and edges when they change
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current) {
      console.log("[3D] Scene or camera not ready");
      return;
    }

    console.log(`[3D] Updating nodes: ${nodes.length} nodes`);
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    // Remove old points
    if (pointsRef.current) {
      scene.remove(pointsRef.current);
      pointsRef.current.geometry.dispose();
      (pointsRef.current.material as THREE.Material).dispose();
      pointsRef.current = null;
    }

    // Remove old edges
    if (edgesRef.current) {
      scene.remove(edgesRef.current);
      edgesRef.current.geometry.dispose();
      (edgesRef.current.material as THREE.Material).dispose();
      edgesRef.current = null;
    }

    // Create new points if we have nodes
    if (nodes.length > 0) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(nodes.length * 3);
      const colors = new Float32Array(nodes.length * 3);

      nodes.forEach((node, i) => {
        positions[i * 3] = node.position.x;
        positions[i * 3 + 1] = node.position.y;
        positions[i * 3 + 2] = node.position.z;

        colors[i * 3] = node.color.r;
        colors[i * 3 + 1] = node.color.g;
        colors[i * 3 + 2] = node.color.b;
      });

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const pointMaterial = new THREE.PointsMaterial({
        size: 20.0,
        vertexColors: true,
        transparent: false,
        opacity: 1.0,
        sizeAttenuation: false,
      });

      const points = new THREE.Points(geometry, pointMaterial);
      scene.add(points);
      pointsRef.current = points;
      
      // Log node positions for debugging
      console.log(`[3D] Added ${nodes.length} nodes to scene`);
      if (nodes.length > 0) {
        console.log(`[3D] First node position:`, {
          id: nodes[0].id,
          x: nodes[0].position.x,
          y: nodes[0].position.y,
          z: nodes[0].position.z,
          color: `rgb(${Math.round(nodes[0].color.r * 255)}, ${Math.round(nodes[0].color.g * 255)}, ${Math.round(nodes[0].color.b * 255)})`
        });
      }
      
      // Center camera on nodes if we have them
      if (nodes.length > 0 && cameraRef.current) {
        const center = new THREE.Vector3();
        nodes.forEach(node => center.add(node.position));
        center.divideScalar(nodes.length);
        controlsRef.current?.target.copy(center);
        controlsRef.current?.update();
      }

    }
  }, [nodes]);

  // Update edges when they change
  useEffect(() => {
    if (!sceneRef.current || nodes.length === 0) return;

    const scene = sceneRef.current;

    // Remove old edges
    if (edgesRef.current) {
      scene.remove(edgesRef.current);
      edgesRef.current.geometry.dispose();
      (edgesRef.current.material as THREE.Material).dispose();
      edgesRef.current = null;
    }

    // Create new edges
    if (edges.length > 0) {
      const edgeGeometry = new THREE.BufferGeometry();
      const edgePositions: number[] = [];
      const edgeColors: number[] = [];

      const nodeMap = new Map(nodes.map((n, i) => [n.id, i]));

      for (const edge of edges) {
        const fromIdx = nodeMap.get(edge.from);
        const toIdx = nodeMap.get(edge.to);
        
        if (fromIdx !== undefined && toIdx !== undefined) {
          const fromNode = nodes[fromIdx];
          const toNode = nodes[toIdx];
          
          edgePositions.push(
            fromNode.position.x,
            fromNode.position.y,
            fromNode.position.z,
            toNode.position.x,
            toNode.position.y,
            toNode.position.z
          );

          // Color based on similarity
          const color = new THREE.Color().lerpColors(
            fromNode.color,
            toNode.color,
            0.5
          );
          color.multiplyScalar(0.4 + edge.similarity * 0.4);
          
          edgeColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
        }
      }

      if (edgePositions.length > 0) {
        edgeGeometry.setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(edgePositions), 3)
        );
        edgeGeometry.setAttribute(
          "color",
          new THREE.BufferAttribute(new Float32Array(edgeColors), 3)
        );

        const edgeMaterial = new THREE.LineBasicMaterial({
          vertexColors: true,
          opacity: 0.4,
          transparent: true,
        });

        const edgesMesh = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        scene.add(edgesMesh);
        edgesRef.current = edgesMesh;
      }
    }
  }, [edges, nodes]);

  // Mouse interaction
  useEffect(() => {
    if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;

    const renderer = rendererRef.current;
    const camera = cameraRef.current;

    const handleMouseMove = (event: MouseEvent) => {
      if (!mountRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      if (pointsRef.current) {
        const intersects = raycasterRef.current.intersectObject(pointsRef.current);
        if (intersects.length > 0) {
          const index = intersects[0].index ?? -1;
          if (index !== hoveredNodeRef.current && index >= 0 && index < nodes.length) {
            hoveredNodeRef.current = index;
            onNodeHover?.(nodes[index].id);
          }
        } else {
          if (hoveredNodeRef.current >= 0) {
            hoveredNodeRef.current = -1;
            onNodeHover?.(null);
          }
        }
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (!mountRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      if (pointsRef.current) {
        const intersects = raycasterRef.current.intersectObject(pointsRef.current);
        if (intersects.length > 0) {
          const index = intersects[0].index ?? -1;
          if (index >= 0 && index < nodes.length) {
            onNodeClick?.(nodes[index].id);
          }
        }
      }
    };

    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("click", handleClick);

    return () => {
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("click", handleClick);
    };
  }, [nodes, onNodeClick, onNodeHover]);

  return <div ref={mountRef} className="w-full h-full" style={{ position: 'relative', zIndex: 1 }} />;
}
